package services

import (
	"database/sql"
	"routewise/internal/models"
)

type AlertService struct{ db *sql.DB }

func NewAlertService(db *sql.DB) *AlertService { return &AlertService{db: db} }

// Refresh checks current records when alerts are requested; no worker or message queue is needed.
// A transaction-level advisory lock keeps concurrent refreshes from producing duplicates.
func (s *AlertService) Refresh() error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.Exec("SELECT pg_advisory_xact_lock(724190)"); err != nil {
		return err
	}
	for _, rule := range []struct{ kind, condition, message string }{
		{"overdue", "s.expected_delivery<CURRENT_TIMESTAMP AND lower(s.status::text) NOT IN ('delivered','cancelled')", "Expected delivery time has passed"},
		{"delayed", "lower(s.status::text)='delayed'", "Shipment has been marked delayed"},
	} {
		_, err = tx.Exec(`INSERT INTO alerts(shipment_id,type,message,is_acknowledged,created_at)
   SELECT s.id,$1::text,s.tracking_number || ': ' || $2,false,CURRENT_TIMESTAMP FROM shipments s WHERE `+rule.condition+`
   AND NOT EXISTS(SELECT 1 FROM alerts a WHERE a.shipment_id=s.id AND a.type=$1::text)`, rule.kind, rule.message)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
func (s *AlertService) List(only bool, page, size int) ([]models.Alert, int, error) {
	if err := s.Refresh(); err != nil {
		return nil, 0, err
	}
	where := ""
	if only {
		where = " WHERE a.is_acknowledged=false"
	}
	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM alerts a" + where).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.Query(`SELECT a.id,a.shipment_id,a.type,a.message,a.is_acknowledged,a.created_at,a.acknowledged_at,s.tracking_number
 FROM alerts a JOIN shipments s ON s.id=a.shipment_id`+where+` ORDER BY a.created_at DESC,a.id DESC LIMIT $1 OFFSET $2`, size, (page-1)*size)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	all := []models.Alert{}
	for rows.Next() {
		var a models.Alert
		if err = rows.Scan(&a.ID, &a.ShipmentID, &a.Type, &a.Message, &a.IsAcknowledged, &a.CreatedAt, &a.AcknowledgedAt, &a.ShipmentTrackingNumber); err != nil {
			return nil, 0, err
		}
		all = append(all, a)
	}
	return all, total, rows.Err()
}
func (s *AlertService) Acknowledge(id int) (*models.Alert, error) {
	var a models.Alert
	err := s.db.QueryRow(`UPDATE alerts SET is_acknowledged=true,acknowledged_at=COALESCE(acknowledged_at,CURRENT_TIMESTAMP)
 WHERE id=$1 RETURNING id,shipment_id,type,message,is_acknowledged,created_at,acknowledged_at`, id).Scan(&a.ID, &a.ShipmentID, &a.Type, &a.Message, &a.IsAcknowledged, &a.CreatedAt, &a.AcknowledgedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}
