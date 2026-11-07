package seed

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// Run creates the complete demo dataset in an empty database.
func Run(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("SELECT pg_advisory_xact_lock(724191)"); err != nil {
		return err
	}
	var populated bool
	err = tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM users)
        OR EXISTS (SELECT 1 FROM customers) OR EXISTS (SELECT 1 FROM carriers)
        OR EXISTS (SELECT 1 FROM routes) OR EXISTS (SELECT 1 FROM shipments)`).Scan(&populated)
	if err != nil {
		return err
	}
	if populated {
		log.Println("[seed] Database already populated, skipping demo data")
		return nil
	}

	for _, step := range []struct {
		name string
		run  func(*sql.Tx) error
	}{
		{"users", seedUsers}, {"customers", seedCustomers}, {"carriers", seedCarriers},
		{"routes", seedRoutes}, {"shipments and tracking events", seedShipments},
	} {
		if err := step.run(tx); err != nil {
			return fmt.Errorf("seed %s: %w", step.name, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	log.Println("[seed] Seeded demo data")
	return nil
}

func seedUsers(db *sql.Tx) error {
	adminHash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	customerHash, err := bcrypt.GenerateFromPassword([]byte("customer123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO users (name, email, password_hash, role, created_at) VALUES
		('Admin User', 'admin@routewise.com', $1, 'admin', NOW()),
		('Customer User', 'customer@routewise.com', $2, 'customer', NOW())
	`, string(adminHash), string(customerHash))
	if err != nil {
		return err
	}
	return nil
}

func seedCustomers(db *sql.Tx) error {
	_, err := db.Exec(`
		INSERT INTO customers (name, email, phone, address, city, country, created_at) VALUES
		('Tokyo Retail Store', 'info@tokyoretail.jp', '03-1234-5678', '1-2-3 Shibuya, Tokyo', 'Tokyo', 'Japan', NOW()),
		('Osaka Electronics Ltd.', 'contact@osakacycle.jp', '06-8765-4321', '4-5-6 Umeda, Osaka', 'Osaka', 'Japan', NOW()),
		('Nagoya Industrial Supply', 'sales@nagoyaindustrial.jp', '052-5678-9012', '7-8-9 Sakura, Nagoya', 'Aichi', 'Japan', NOW()),
		('Kyoto Office Systems', 'support@kyotooffice.jp', '075-1234-5678', '10-11-12 Gion, Kyoto', 'Kyoto', 'Japan', NOW()),
		('Yokohama Medical Supplies', 'orders@yokohamamedical.jp', '045-9876-5432', '15-16-17 Chinatown, Yokohama', 'Kanagawa', 'Japan', NOW())
	`)
	if err != nil {
		return err
	}
	return nil
}

func seedCarriers(db *sql.Tx) error {
	_, err := db.Exec(`
		INSERT INTO carriers (name, code, historical_delay_rate, created_at) VALUES
		('Sakura Express', 'SAK', 0.15, NOW()),
		('Hikari Logistics', 'HIK', 0.25, NOW()),
		('EastLine Transport', 'EAS', 0.10, NOW()),
		('Pacific Cargo', 'PAC', 0.35, NOW())
	`)
	if err != nil {
		return err
	}
	return nil
}

func seedRoutes(db *sql.Tx) error {
	_, err := db.Exec(`
		INSERT INTO routes (origin, destination, distance_km, estimated_hours, created_at) VALUES
		('Osaka', 'Tokyo', 500, 8, NOW()),
		('Nagoya', 'Tokyo', 350, 6, NOW()),
		('Tokyo', 'Yokohama', 40, 2, NOW()),
		('Osaka', 'Nagoya', 180, 4, NOW()),
		('Kyoto', 'Osaka', 60, 2, NOW())
	`)
	if err != nil {
		return err
	}
	return nil
}

func seedShipments(db *sql.Tx) error {
	// Create demo shipments
	shipments := []struct {
		tracking string
		carrier  string
		route    int
		weight   float64
		priority string
		status   string
	}{
		{"SHP-1001", "SAK", 0, 18.5, "normal", "in_transit"},
		{"SHP-1002", "HIK", 1, 25.0, "high", "in_transit"},
		{"SHP-1003", "SAK", 2, 5.2, "low", "in_transit"},
		{"SHP-1004", "EAS", 3, 7.9, "normal", "in_transit"},
		{"SHP-1005", "SAK", 3, 8.3, "normal", "in_transit"},
		{"SHP-1006", "HIK", 1, 32.1, "high", "in_transit"},
		{"SHP-1007", "PAC", 0, 45.0, "high", "in_transit"},
		{"SHP-1008", "SAK", 2, 3.5, "low", "in_transit"},
		{"SHP-1009", "HIK", 3, 12.8, "normal", "in_transit"},
		{"SHP-1010", "SAK", 4, 15.2, "normal", "in_transit"},
		{"SHP-1011", "EAS", 0, 22.4, "high", "in_transit"},
		{"SHP-1012", "PAC", 1, 18.7, "normal", "in_transit"},
		{"SHP-1013", "SAK", 2, 9.1, "normal", "in_transit"},
		{"SHP-1014", "EAS", 2, 4.3, "low", "in_transit"},
		{"SHP-1015", "SAK", 0, 11.9, "normal", "in_transit"},
		{"SHP-1017", "HIK", 1, 25.8, "normal", "delayed"},
		{"SHP-1019", "PAC", 0, 19.3, "normal", "in_transit"},
		{"SHP-1020", "SAK", 3, 14.7, "normal", "in_transit"},
		{"SHP-1023", "SAK", 0, 42.1, "high", "delivered"},
		{"SHP-1024", "EAS", 2, 16.8, "normal", "delivered"},
		{"SHP-1025", "HIK", 0, 5.9, "low", "processing"},
		{"SHP-1021", "SAK", 3, 8.4, "low", "in_transit"},
		{"SHP-1022", "PAC", 1, 28.9, "high", "in_transit"},
	}

	routes := [][2]string{
		{"Osaka", "Tokyo"}, {"Nagoya", "Tokyo"}, {"Tokyo", "Yokohama"},
		{"Osaka", "Nagoya"}, {"Kyoto", "Osaka"},
	}
	now := time.Now().UTC()
	createdAt := now.Add(-2 * time.Hour)
	for _, shipment := range shipments {
		expected := now.Add(48 * time.Hour)
		var delivered *time.Time
		switch shipment.status {
		case "delayed":
			expected = now.Add(-30 * time.Minute)
		case "delivered":
			actual := now.Add(-10 * time.Minute)
			delivered = &actual
			expected = now.Add(time.Hour)
			if shipment.tracking == "SHP-1024" {
				expected = now.Add(-20 * time.Minute)
			}
		}
		route := routes[shipment.route]
		var id int
		err := db.QueryRow(`
            INSERT INTO shipments (tracking_number, customer_id, carrier_id, route_id,
                package_weight, priority, status, created_at, expected_delivery, actual_delivery)
            VALUES ($1, (SELECT id FROM customers WHERE email = 'info@tokyoretail.jp'),
                (SELECT id FROM carriers WHERE code = $2),
                (SELECT id FROM routes WHERE origin = $3 AND destination = $4),
                $5, $6, $7, $8, $9, $10)
            RETURNING id`, shipment.tracking, shipment.carrier, route[0], route[1],
			shipment.weight, shipment.priority, shipment.status, createdAt, expected, delivered).Scan(&id)
		if err != nil {
			return fmt.Errorf("insert shipment %s: %w", shipment.tracking, err)
		}

		type shipmentEvent struct {
			status, location, description string
			at                            time.Time
		}
		events := []shipmentEvent{
			{"processing", route[0], "Shipment created", createdAt},
		}
		if shipment.status != "processing" {
			events = append(events,
				shipmentEvent{"dispatched", route[0], "Shipment dispatched", now.Add(-time.Hour)},
				shipmentEvent{"in_transit", route[0] + " to " + route[1], "Shipment in transit", now.Add(-45 * time.Minute)},
			)
		}
		if shipment.status == "delayed" {
			events = append(events, shipmentEvent{"delayed", route[0] + " to " + route[1], "Delivery delayed in transit", now.Add(-15 * time.Minute)})
		}
		if delivered != nil {
			events = append(events,
				shipmentEvent{"out_for_delivery", route[1], "Out for delivery", now.Add(-30 * time.Minute)},
				shipmentEvent{"delivered", route[1], "Shipment delivered", *delivered},
			)
		}
		for _, event := range events {
			if _, err := db.Exec(`INSERT INTO shipment_events (shipment_id, status, location, timestamp, description)
                VALUES ($1, $2, $3, $4, $5)`, id, event.status, event.location, event.at, event.description); err != nil {
				return fmt.Errorf("insert %s event for %s: %w", event.status, shipment.tracking, err)
			}
		}
	}
	return nil
}
