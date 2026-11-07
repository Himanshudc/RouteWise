package services

import (
	"database/sql"
	"fmt"
	"time"
)

// CarrierService handles carrier business logic.
type CarrierService struct {
	db *sql.DB
}

func NewCarrierService(db *sql.DB) *CarrierService {
	return &CarrierService{db: db}
}

// Create inserts a new carrier.
func (s *CarrierService) Create(name, code string, delayRate float64) (map[string]interface{}, error) {
	var id int
	err := s.db.QueryRow(
		`INSERT INTO carriers (name, code, historical_delay_rate, created_at)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id`,
		name, code, delayRate,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetByID(id)
}

// GetByID returns a carrier by ID.
func (s *CarrierService) GetByID(id int) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`SELECT id, name, code, historical_delay_rate, created_at
		 FROM carriers WHERE id = $1`, id,
	)
	return scanCarrier(row)
}

// GetByCode returns a carrier by code.
func (s *CarrierService) GetByCode(code string) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`SELECT id, name, code, historical_delay_rate, created_at
		 FROM carriers WHERE code = $1`, code,
	)
	return scanCarrier(row)
}

// List returns carriers with optional search and pagination.
func (s *CarrierService) List(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	offset := (page - 1) * pageSize
	query := `SELECT id, name, code, historical_delay_rate, created_at FROM carriers`
	countQuery := `SELECT COUNT(*) FROM carriers`
	var args []interface{}

	if search != "" {
		like := "%" + search + "%"
		query += ` WHERE name ILIKE $1 OR code ILIKE $1`
		countQuery += ` WHERE name ILIKE $1 OR code ILIKE $1`
		args = append(args, like)
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, pageSize, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	carriers := []map[string]interface{}{}
	for rows.Next() {
		c, err := scanCarrierRow(rows)
		if err != nil {
			return nil, 0, err
		}
		carriers = append(carriers, c)
	}

	var total int
	countArgs := args[:len(args)-2]
	if len(countArgs) == 0 {
		if err := s.db.QueryRow(countQuery).Scan(&total); err != nil {
			return nil, 0, err
		}
	} else {
		if err := s.db.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
			return nil, 0, err
		}
	}

	return carriers, total, rows.Err()
}

// Update updates an existing carrier.
func (s *CarrierService) Update(id int, name, code *string, delayRate *float64) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`UPDATE carriers SET
		 name = COALESCE($1, name),
		 code = COALESCE($2, code),
		 historical_delay_rate = COALESCE($3, historical_delay_rate)
		 WHERE id = $4
		 RETURNING id, name, code, historical_delay_rate, created_at`,
		name, code, delayRate, id,
	)
	return scanCarrier(row)
}

// Delete removes a carrier by ID.
func (s *CarrierService) Delete(id int) (bool, error) {
	res, err := s.db.Exec("DELETE FROM carriers WHERE id = $1", id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// GetPerformance returns carrier performance metrics.
func (s *CarrierService) GetPerformance(id int) (map[string]interface{}, error) {
	carrier, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	var total, delivered, late int
	err = s.db.QueryRow(`SELECT COUNT(*),COUNT(*) FILTER(WHERE lower(status::text)='delivered'),
 COUNT(*) FILTER(WHERE lower(status::text)='delivered' AND actual_delivery>expected_delivery) FROM shipments WHERE carrier_id=$1`, id).Scan(&total, &delivered, &late)
	if err != nil {
		return nil, err
	}
	delayed := late
	onTimeRate := 0.0
	if delivered > 0 {
		onTimeRate = float64(delivered-late) / float64(delivered)
	}

	carrier["total_shipments"] = total
	carrier["delayed_shipments"] = delayed
	carrier["on_time_rate"] = onTimeRate
	return carrier, nil
}

func scanCarrier(row *sql.Row) (map[string]interface{}, error) {
	var (
		id                  int
		name                string
		code                string
		historicalDelayRate float64
		createdAt           time.Time
	)
	if err := row.Scan(&id, &name, &code, &historicalDelayRate, &createdAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id, "name": name, "code": code,
		"historical_delay_rate": historicalDelayRate,
		"created_at":            createdAt,
	}, nil
}

func scanCarrierRow(rows *sql.Rows) (map[string]interface{}, error) {
	var (
		id                  int
		name                string
		code                string
		historicalDelayRate float64
		createdAt           time.Time
	)
	if err := rows.Scan(&id, &name, &code, &historicalDelayRate, &createdAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id, "name": name, "code": code,
		"historical_delay_rate": historicalDelayRate,
		"created_at":            createdAt,
	}, nil
}
