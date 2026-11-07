package services

import (
	"database/sql"
	"fmt"
	"time"
)

// RouteService handles route business logic.
type RouteService struct {
	db *sql.DB
}

func NewRouteService(db *sql.DB) *RouteService {
	return &RouteService{db: db}
}

// Create inserts a new route.
func (s *RouteService) Create(origin, destination string, distanceKm, estimatedHours int) (map[string]interface{}, error) {
	var id int
	err := s.db.QueryRow(
		`INSERT INTO routes (origin, destination, distance_km, estimated_hours, created_at)
		 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id`,
		origin, destination, distanceKm, estimatedHours,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetByID(id)
}

// GetByID returns a route by ID.
func (s *RouteService) GetByID(id int) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`SELECT id, origin, destination, distance_km, estimated_hours, created_at
		 FROM routes WHERE id = $1`, id,
	)
	return scanRoute(row)
}

// List returns routes with optional search and pagination.
func (s *RouteService) List(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	offset := (page - 1) * pageSize
	query := `SELECT id, origin, destination, distance_km, estimated_hours, created_at FROM routes`
	countQuery := `SELECT COUNT(*) FROM routes`
	var args []interface{}

	if search != "" {
		like := "%" + search + "%"
		query += ` WHERE origin ILIKE $1 OR destination ILIKE $1`
		countQuery += ` WHERE origin ILIKE $1 OR destination ILIKE $1`
		args = append(args, like)
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, pageSize, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	routes := []map[string]interface{}{}
	for rows.Next() {
		r, err := scanRouteRow(rows)
		if err != nil {
			return nil, 0, err
		}
		routes = append(routes, r)
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

	return routes, total, rows.Err()
}

// Update updates an existing route.
func (s *RouteService) Update(id int, origin, destination *string, distanceKm, estimatedHours *int) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`UPDATE routes SET
		 origin = COALESCE($1, origin),
		 destination = COALESCE($2, destination),
		 distance_km = COALESCE($3, distance_km),
		 estimated_hours = COALESCE($4, estimated_hours)
		 WHERE id = $5
		 RETURNING id, origin, destination, distance_km, estimated_hours, created_at`,
		origin, destination, distanceKm, estimatedHours, id,
	)
	return scanRoute(row)
}

// Delete removes a route by ID.
func (s *RouteService) Delete(id int) (bool, error) {
	res, err := s.db.Exec("DELETE FROM routes WHERE id = $1", id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func scanRoute(row *sql.Row) (map[string]interface{}, error) {
	var (
		id             int
		origin         string
		destination    string
		distanceKm     int
		estimatedHours int
		createdAt      time.Time
	)
	if err := row.Scan(&id, &origin, &destination, &distanceKm, &estimatedHours, &createdAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id, "origin": origin, "destination": destination,
		"distance_km": distanceKm, "estimated_hours": estimatedHours,
		"created_at": createdAt,
	}, nil
}

func scanRouteRow(rows *sql.Rows) (map[string]interface{}, error) {
	var (
		id             int
		origin         string
		destination    string
		distanceKm     int
		estimatedHours int
		createdAt      time.Time
	)
	if err := rows.Scan(&id, &origin, &destination, &distanceKm, &estimatedHours, &createdAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id, "origin": origin, "destination": destination,
		"distance_km": distanceKm, "estimated_hours": estimatedHours,
		"created_at": createdAt,
	}, nil
}
