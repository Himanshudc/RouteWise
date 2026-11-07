package services

import (
	"database/sql"
	"fmt"
	"time"
)

// CustomerService handles customer business logic.
type CustomerService struct {
	db *sql.DB
}

func NewCustomerService(db *sql.DB) *CustomerService {
	return &CustomerService{db: db}
}

// Create inserts a new customer and returns its ID.
func (s *CustomerService) Create(name, email, phone, address, city, country string) (int, error) {
	var id int
	err := s.db.QueryRow(
		`INSERT INTO customers (name, email, phone, address, city, country, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING id`,
		name, nilIfEmpty(email), nilIfEmpty(phone), nilIfEmpty(address), nilIfEmpty(city), country,
	).Scan(&id)
	return id, err
}

// GetByID returns a customer by ID.
func (s *CustomerService) GetByID(id int) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`SELECT id, name, email, phone, address, city, country, created_at
		 FROM customers WHERE id = $1`, id,
	)
	return scanCustomer(row)
}

// List returns customers with optional search and pagination.
func (s *CustomerService) List(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	offset := (page - 1) * pageSize
	query := `SELECT id, name, email, phone, address, city, country, created_at FROM customers`
	countQuery := `SELECT COUNT(*) FROM customers`
	var args []interface{}

	if search != "" {
		like := "%" + search + "%"
		query += ` WHERE name ILIKE $1 OR email ILIKE $1 OR city ILIKE $1`
		countQuery += ` WHERE name ILIKE $1 OR email ILIKE $1 OR city ILIKE $1`
		args = append(args, like)
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, pageSize, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	customers := []map[string]interface{}{}
	for rows.Next() {
		c, err := scanCustomerRow(rows)
		if err != nil {
			return nil, 0, err
		}
		customers = append(customers, c)
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

	return customers, total, rows.Err()
}

// Update updates an existing customer.
func (s *CustomerService) Update(id int, name, email, phone, address, city, country *string) (map[string]interface{}, error) {
	row := s.db.QueryRow(
		`UPDATE customers SET
		 name = COALESCE($1, name),
		 email = COALESCE($2, email),
		 phone = COALESCE($3, phone),
		 address = COALESCE($4, address),
		 city = COALESCE($5, city),
		 country = COALESCE($6, country)
		 WHERE id = $7
		 RETURNING id, name, email, phone, address, city, country, created_at`,
		name, email, phone, address, city, country, id,
	)
	return scanCustomer(row)
}

// Delete removes a customer by ID.
func (s *CustomerService) Delete(id int) (bool, error) {
	res, err := s.db.Exec("DELETE FROM customers WHERE id = $1", id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func scanCustomer(row *sql.Row) (map[string]interface{}, error) {
	var (
		id        int
		name      string
		email     *string
		phone     *string
		address   *string
		city      *string
		country   string
		createdAt time.Time
	)
	if err := row.Scan(&id, &name, &email, &phone, &address, &city, &country, &createdAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id, "name": name, "email": email, "phone": phone,
		"address": address, "city": city, "country": country,
		"created_at": createdAt,
	}, nil
}

func scanCustomerRow(rows *sql.Rows) (map[string]interface{}, error) {
	var (
		id        int
		name      string
		email     *string
		phone     *string
		address   *string
		city      *string
		country   string
		createdAt time.Time
	)
	if err := rows.Scan(&id, &name, &email, &phone, &address, &city, &country, &createdAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id": id, "name": name, "email": email, "phone": phone,
		"address": address, "city": city, "country": country,
		"created_at": createdAt,
	}, nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
