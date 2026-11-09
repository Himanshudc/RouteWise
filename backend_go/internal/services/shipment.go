package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"routewise/internal/models"
	"routewise/internal/risk"
	"strings"
	"time"
)

var ErrInvalid = errors.New("invalid input")

func invalid(message string) error { return fmt.Errorf("%w: %s", ErrInvalid, message) }

type ShipmentService struct{ db *sql.DB }

func NewShipmentService(db *sql.DB) *ShipmentService { return &ShipmentService{db: db} }

const shipmentSelect = `SELECT s.id,s.tracking_number,s.customer_id,s.carrier_id,s.route_id,
 s.package_weight,lower(s.priority::text),lower(s.status::text),s.created_at,s.expected_delivery,s.actual_delivery,
 c.name,COALESCE(c.city,''),ca.name,ca.code,ca.historical_delay_rate,
 r.origin,r.destination,r.distance_km,r.estimated_hours
 FROM shipments s JOIN customers c ON c.id=s.customer_id
 JOIN carriers ca ON ca.id=s.carrier_id JOIN routes r ON r.id=s.route_id`

// Legacy SQLAlchemy enum columns store uppercase labels. Current columns use lowercase text.
func storedChoice(db interface {
	QueryRow(string, ...any) *sql.Row
}, table, column, value string) (string, error) {
	var isEnum bool
	err := db.QueryRow(`SELECT t.typtype = 'e' FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
 WHERE a.attrelid = $1::text::regclass AND a.attname = $2 AND NOT a.attisdropped`, table, column).Scan(&isEnum)
	if isEnum {
		value = strings.ToUpper(value)
	}
	return value, err
}

func insertEvent(tx *sql.Tx, id int, status models.ShipmentStatus, location, description string) error {
	value, err := storedChoice(tx, "shipment_events", "status", string(status))
	if err != nil {
		return err
	}
	_, err = tx.Exec("INSERT INTO shipment_events(shipment_id,status,location,description,timestamp) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)",
		id, value, nilIfEmpty(location), nilIfEmpty(description))
	return err
}

type scanner interface{ Scan(...interface{}) error }

func scanShipment(row scanner) (*models.Shipment, error) {
	sh := &models.Shipment{Customer: &models.Customer{}, Carrier: &models.Carrier{}, Route: &models.Route{}, Events: []models.ShipmentEvent{}}
	var city string
	err := row.Scan(&sh.ID, &sh.TrackingNumber, &sh.CustomerID, &sh.CarrierID, &sh.RouteID,
		&sh.PackageWeight, &sh.Priority, &sh.Status, &sh.CreatedAt, &sh.ExpectedDelivery, &sh.ActualDelivery,
		&sh.Customer.Name, &city, &sh.Carrier.Name, &sh.Carrier.Code, &sh.Carrier.HistoricalDelayRate,
		&sh.Route.Origin, &sh.Route.Destination, &sh.Route.DistanceKm, &sh.Route.EstimatedHours)
	sh.Customer.ID = sh.CustomerID
	sh.Customer.City = &city
	sh.Carrier.ID = sh.CarrierID
	sh.Route.ID = sh.RouteID
	return sh, err
}
func (s *ShipmentService) GetByID(id int) (*models.Shipment, error) {
	sh, err := scanShipment(s.db.QueryRow(shipmentSelect+" WHERE s.id=$1", id))
	if err != nil {
		return nil, err
	}
	sh.Events, err = s.GetEvents(id)
	if err != nil {
		return nil, err
	}
	p := s.score(sh)
	sh.RiskLevel = p.RiskLevel
	sh.RiskProbability = p.Probability
	sh.RiskMethod = p.Method
	sh.RiskReasons = p.Reasons
	return sh, nil
}
func (s *ShipmentService) GetByTrackingNumber(number string) (*models.Shipment, error) {
	var id int
	if err := s.db.QueryRow("SELECT id FROM shipments WHERE tracking_number=$1", number).Scan(&id); err != nil {
		return nil, err
	}
	return s.GetByID(id)
}
func (s *ShipmentService) List(f models.ShipmentFilters, page, size int) ([]models.Shipment, int, error) {
	conditions := []string{}
	args := []interface{}{}
	add := func(expr string, value interface{}) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(expr, len(args)))
	}
	if f.Search != "" {
		add("(s.tracking_number ILIKE $%[1]d OR c.name ILIKE $%[1]d)", "%"+f.Search+"%")
	}
	if f.Status != "" {
		add("lower(s.status::text)=$%d", f.Status)
	}
	if f.CarrierID > 0 {
		add("s.carrier_id=$%d", f.CarrierID)
	}
	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}
	rows, err := s.db.Query(shipmentSelect+where+" ORDER BY s.created_at DESC,s.id DESC", args...)
	if err != nil {
		return nil, 0, err
	}
	// Close the result before querying events through the same connection pool.
	all := []models.Shipment{}
	for rows.Next() {
		sh, e := scanShipment(rows)
		if e != nil {
			rows.Close()
			return nil, 0, e
		}
		all = append(all, *sh)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, err
	}
	filtered := []models.Shipment{}
	for _, sh := range all {
		sh.Events, err = s.GetEvents(sh.ID)
		if err != nil {
			return nil, 0, err
		}
		p := s.score(&sh)
		sh.RiskLevel = p.RiskLevel
		sh.RiskProbability = p.Probability
		if f.RiskLevel == "" || sh.RiskLevel == f.RiskLevel {
			filtered = append(filtered, sh)
		}
	}
	total := len(filtered)
	start := (page - 1) * size
	if start > total {
		start = total
	}
	end := start + size
	if end > total {
		end = total
	}
	return filtered[start:end], total, nil
}
func validPriority(p string) bool { return p == "low" || p == "normal" || p == "high" }
func (s *ShipmentService) Create(cust, carrier, route int, weight float64, priority, tracking string, expected time.Time) (*models.Shipment, error) {
	if cust < 1 || carrier < 1 || route < 1 || weight <= 0 || !validPriority(priority) || expected.IsZero() {
		return nil, invalid("valid customer, carrier, route, weight, priority and delivery date required")
	}
	if len(tracking) > 30 {
		return nil, invalid("tracking number must be at most 30 characters")
	}
	if tracking == "" {
		b := make([]byte, 8)
		if _, err := rand.Read(b); err != nil {
			return nil, err
		}
		tracking = "SHP-" + strings.ToUpper(hex.EncodeToString(b))
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	storedPriority, err := storedChoice(tx, "shipments", "priority", priority)
	if err != nil {
		return nil, err
	}
	storedStatus, err := storedChoice(tx, "shipments", "status", string(models.StatusProcessing))
	if err != nil {
		return nil, err
	}
	var id int
	err = tx.QueryRow(`INSERT INTO shipments(tracking_number,customer_id,carrier_id,route_id,package_weight,priority,status,expected_delivery,created_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP) RETURNING id`, tracking, cust, carrier, route, weight, storedPriority, storedStatus, expected.UTC()).Scan(&id)
	if err != nil {
		return nil, err
	}
	if err = insertEvent(tx, id, models.StatusProcessing, "", "Shipment created"); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetByID(id)
}
func (s *ShipmentService) ValidateTransition(from, to models.ShipmentStatus) bool {
	for _, allowed := range models.ValidTransitions[from] {
		if to == allowed {
			return true
		}
	}
	return false
}
func (s *ShipmentService) UpdateStatus(id int, to models.ShipmentStatus, location, description string) (*models.Shipment, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var from models.ShipmentStatus
	if err = tx.QueryRow("SELECT lower(status::text) FROM shipments WHERE id=$1 FOR UPDATE", id).Scan(&from); err != nil {
		return nil, err
	}
	if !s.ValidateTransition(from, to) {
		return nil, invalid("invalid status transition")
	}
	storedStatus, err := storedChoice(tx, "shipments", "status", string(to))
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(`UPDATE shipments SET status=$1,actual_delivery=CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE actual_delivery END WHERE id=$2`, storedStatus, id, to == models.StatusDelivered)
	if err != nil {
		return nil, err
	}
	err = insertEvent(tx, id, to, location, description)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetByID(id)
}
func (s *ShipmentService) Update(id int, status, priority *string, expected *time.Time) (*models.Shipment, error) {
	if status != nil {
		return nil, invalid("use the status endpoint to change shipment status")
	}
	if priority == nil && expected == nil {
		return nil, invalid("no changes supplied")
	}
	if priority != nil && !validPriority(*priority) {
		return nil, invalid("invalid priority")
	}
	if priority != nil {
		value, err := storedChoice(s.db, "shipments", "priority", *priority)
		if err != nil {
			return nil, err
		}
		priority = &value
	}
	result, err := s.db.Exec("UPDATE shipments SET priority=COALESCE($1,priority),expected_delivery=COALESCE($2,expected_delivery) WHERE id=$3", priority, expected, id)
	if err != nil {
		return nil, err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, sql.ErrNoRows
	}
	return s.GetByID(id)
}
func (s *ShipmentService) AddEvent(id int, status models.ShipmentStatus, location, description string) error {
	// Events may annotate the current status. Status changes must use UpdateStatus.
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var current models.ShipmentStatus
	if err = tx.QueryRow("SELECT lower(status::text) FROM shipments WHERE id=$1 FOR UPDATE", id).Scan(&current); err != nil {
		return err
	}
	if status != current {
		return invalid("event status must match current shipment status")
	}
	err = insertEvent(tx, id, status, location, description)
	if err != nil {
		return err
	}
	return tx.Commit()
}
func (s *ShipmentService) GetEvents(id int) ([]models.ShipmentEvent, error) {
	rows, err := s.db.Query("SELECT id,shipment_id,lower(status::text),location,timestamp,description FROM shipment_events WHERE shipment_id=$1 ORDER BY timestamp,id", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []models.ShipmentEvent{}
	for rows.Next() {
		var e models.ShipmentEvent
		if err = rows.Scan(&e.ID, &e.ShipmentID, &e.Status, &e.Location, &e.Timestamp, &e.Description); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}
func (s *ShipmentService) score(sh *models.Shipment) risk.Prediction {
	if sh.Status == models.StatusDelayed {
		return risk.Prediction{RiskLevel: "HIGH", Reasons: []string{"Shipment has been marked delayed"}, Method: "rules"}
	}
	active := sh.Status == models.StatusDispatched || sh.Status == models.StatusInTransit || sh.Status == models.StatusOutForDelivery || sh.Status == models.StatusDelayed
	if !active {
		return risk.Prediction{RiskLevel: "LOW", Reasons: []string{"Shipment is not in transit"}, Method: "rules"}
	}
	hours := 0.0
	for _, e := range sh.Events {
		if e.Status == models.StatusDispatched {
			hours = time.Since(e.Timestamp).Hours()
			break
		}
	}
	priority := 1
	if sh.Priority == models.PriorityLow {
		priority = 0
	}
	if sh.Priority == models.PriorityHigh {
		priority = 2
	}
	features := risk.Features{DistanceKm: sh.Route.DistanceKm, PackageWeight: sh.PackageWeight, CarrierDelayRate: sh.Carrier.HistoricalDelayRate,
		EstimatedHours: sh.Route.EstimatedHours, CurrentTransitHours: hours, DayOfWeek: (int(time.Now().UTC().Weekday()) + 6) % 7, Priority: priority}
	assessment := risk.Rules(features)
	remaining := time.Until(sh.ExpectedDelivery)
	if remaining <= 0 {
		return risk.Prediction{RiskLevel: "HIGH", Reasons: []string{"Expected delivery time has passed"}, Method: "rules"}
	}
	if assessment.RiskLevel == "HIGH" {
		assessment.RiskLevel = "MEDIUM"
		assessment.Reasons = []string{"Transit time exceeds the route estimate, but delivery is not overdue"}
	} else if remaining.Hours() <= float64(sh.Route.EstimatedHours)*0.2 {
		assessment.RiskLevel = "MEDIUM"
		assessment.Reasons = []string{"Expected delivery time is approaching"}
	}
	return assessment
}
func (s *ShipmentService) Predict(id int) (*models.ShipmentPrediction, error) {
	sh, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}
	p := s.score(sh)
	return &models.ShipmentPrediction{Shipment: sh, RiskLevel: p.RiskLevel, Probability: p.Probability, Reasons: p.Reasons, Method: p.Method}, nil
}
