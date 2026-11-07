package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/jackc/pgx/v5/stdlib"
	"net/http/httptest"
	"net/url"
	"os"
	"routewise/internal/seed"
	"testing"
	"time"
)

func TestPublicAndProtectedRoutes(t *testing.T) {
	handler := NewRouter(nil)
	for _, tc := range []struct {
		method, path string
		want         int
	}{{"GET", "/health", 200}, {"GET", "/api/shipments", 401}, {"GET", "/api/dashboard/summary", 404}, {"DELETE", "/health", 405}} {
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
		if w.Code != tc.want {
			t.Errorf("%s: %d", tc.path, w.Code)
		}
	}
}

// Each run owns a new schema. No existing tables or records are modified.
func TestPostgresWorkflow(t *testing.T) {
	t.Run("current schema", func(t *testing.T) { testPostgresWorkflow(t, false) })
	t.Run("legacy schema", func(t *testing.T) { testPostgresWorkflow(t, true) })
}

func testPostgresWorkflow(t *testing.T, legacy bool) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("Set TEST_DATABASE_URL for PostgreSQL integration checks")
	}
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	base, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer base.Close()
	schema := fmt.Sprintf("routewise_test_%d", time.Now().UnixNano())
	if _, err = base.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer base.Exec("DROP SCHEMA " + schema + " CASCADE")
	q := u.Query()
	q.Set("search_path", schema)
	q.Set("timezone", "UTC")
	u.RawQuery = q.Encode()
	db, err := sql.Open("pgx", u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ddl, err := os.ReadFile("../db/schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(string(ddl)); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`ALTER SEQUENCE shipments_id_seq RESTART WITH 100;
ALTER SEQUENCE customers_id_seq RESTART WITH 100;
ALTER SEQUENCE carriers_id_seq RESTART WITH 100;
ALTER SEQUENCE routes_id_seq RESTART WITH 100;`); err != nil {
		t.Fatal(err)
	}
	if err = seed.Run(db); err != nil {
		t.Fatal(err)
	}
	if err = seed.Run(db); err != nil {
		t.Fatal(err)
	}
	var seeded, validHistories int
	err = db.QueryRow(`SELECT COUNT(*), COUNT(*) FILTER (
		WHERE s.status = (SELECT status FROM shipment_events WHERE shipment_id=s.id ORDER BY timestamp DESC,id DESC LIMIT 1)
		AND (SELECT COUNT(*) FROM shipment_events WHERE shipment_id=s.id AND status='processing') = 1
		AND (s.status <> 'delivered' OR s.actual_delivery IS NOT NULL))
		FROM shipments s`).Scan(&seeded, &validHistories)
	if err != nil || seeded == 0 || seeded != validHistories {
		t.Fatalf("demo shipment histories: %d valid of %d; error: %v", validHistories, seeded, err)
	}
	if legacy {
		_, err := db.Exec(`
CREATE TYPE shipmentstatus AS ENUM ('PROCESSING','DISPATCHED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','DELAYED','CANCELLED');
CREATE TYPE shipmentpriority AS ENUM ('LOW','NORMAL','HIGH');
CREATE TYPE userrole AS ENUM ('ADMIN','CUSTOMER');
ALTER TABLE shipments ALTER COLUMN status DROP DEFAULT, ALTER COLUMN priority DROP DEFAULT,
  ALTER COLUMN status TYPE shipmentstatus USING upper(status)::shipmentstatus,
  ALTER COLUMN priority TYPE shipmentpriority USING upper(priority)::shipmentpriority,
  ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE shipment_events ALTER COLUMN status TYPE shipmentstatus USING upper(status)::shipmentstatus,
  ALTER COLUMN timestamp DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role DROP DEFAULT, ALTER COLUMN role TYPE userrole USING upper(role)::userrole,
  ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE customers ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE carriers ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE routes ALTER COLUMN created_at DROP DEFAULT;
`)
		if err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv("SECRET_KEY", "integration-test-key-at-least-thirty-two-characters")
	t.Setenv("ENABLE_ML", "false")
	handler := NewRouter(db)
	request := func(method, path string, body interface{}, token string, want int) map[string]interface{} {
		t.Helper()
		var payload bytes.Buffer
		if body != nil {
			if err := json.NewEncoder(&payload).Encode(body); err != nil {
				t.Fatal(err)
			}
		}
		r := httptest.NewRequest(method, path, &payload)
		if token != "" {
			r.Header.Set("Authorization", "Bearer "+token)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("%s %s: want %d, got %d: %s", method, path, want, w.Code, w.Body.String())
		}
		var result map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &result)
		return result
	}
	// Existing installations can have uppercase roles from the Python backend.
	if _, err := db.Exec("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@routewise.com'"); err != nil {
		t.Fatal(err)
	}
	login := request("POST", "/api/auth/login", map[string]string{"email": "admin@routewise.com", "password": "admin123"}, "", 200)
	token := login["access_token"].(string)
	request("POST", "/api/auth/register", map[string]string{"name": "Customer", "email": "new@example.com", "password": "password123", "role": "admin"}, "", 201)
	customerLogin := request("POST", "/api/auth/login", map[string]string{"email": "new@example.com", "password": "password123"}, "", 200)
	customerToken := customerLogin["access_token"].(string)
	for _, path := range []string{"/api/shipments", "/api/shipments/1", "/api/customers"} {
		request("GET", path, nil, customerToken, 403)
	}
	customer := request("POST", "/api/customers", map[string]string{"name": "Test Customer", "city": "Kathmandu"}, token, 201)
	carrier := request("POST", "/api/carriers", map[string]interface{}{"name": "Test Carrier", "code": "TEST", "historical_delay_rate": .1}, token, 201)
	route := request("POST", "/api/routes", map[string]interface{}{"origin": "A", "destination": "B", "distance_km": 100, "estimated_hours": 10}, token, 201)
	for _, item := range []struct {
		resource string
		id       any
		update   map[string]any
	}{
		{"customers", customer["id"], map[string]any{"name": "Updated Customer"}},
		{"carriers", carrier["id"], map[string]any{"name": "Updated Carrier"}},
		{"routes", route["id"], map[string]any{"origin": "Updated Origin"}},
	} {
		endpoint := fmt.Sprintf("/api/%s/%.0f", item.resource, item.id)
		request("PUT", endpoint, item.update, token, 200)
		request("GET", endpoint, nil, token, 200)
	}
	tempCustomer := request("POST", "/api/customers", map[string]any{"name": "Disposable Customer"}, token, 201)
	tempCarrier := request("POST", "/api/carriers", map[string]any{"name": "Disposable Carrier", "code": "TEMP"}, token, 201)
	tempRoute := request("POST", "/api/routes", map[string]any{"origin": "C", "destination": "D", "distance_km": 10, "estimated_hours": 1}, token, 201)
	for resource, item := range map[string]map[string]any{"customers": tempCustomer, "carriers": tempCarrier, "routes": tempRoute} {
		endpoint := fmt.Sprintf("/api/%s/%.0f", resource, item["id"])
		request("DELETE", endpoint, nil, token, 204)
		request("GET", endpoint, nil, token, 404)
	}
	payload := map[string]interface{}{"customer_id": customer["id"], "carrier_id": carrier["id"], "route_id": route["id"], "package_weight": 2, "priority": "normal", "expected_delivery": time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)}
	shipment := request("POST", "/api/shipments", payload, token, 201)
	id := int(shipment["id"].(float64))
	path := fmt.Sprintf("/api/shipments/%d", id)
	number := shipment["tracking_number"].(string)
	second := request("POST", "/api/shipments", payload, token, 201)
	if second["tracking_number"] == number {
		t.Fatal("duplicate generated tracking number")
	}
	request("PUT", path+"/status", map[string]string{"status": "delivered"}, token, 400)
	request("PUT", path, map[string]string{"status": "delivered"}, token, 400)
	initialCreated := shipment["created_at"]
	for _, status := range []string{"dispatched", "in_transit", "delayed", "in_transit", "out_for_delivery", "delivered"} {
		result := request("PUT", path+"/status", map[string]string{"status": status, "location": "Depot", "description": "Updated"}, token, 200)
		if result["created_at"] != initialCreated {
			t.Fatal("created_at changed")
		}
	}
	detail := request("GET", path, nil, token, 200)
	if detail["actual_delivery"] == nil || len(detail["events"].([]interface{})) != 7 {
		t.Fatal("delivery timestamp/history", detail)
	}
	tracked := request("GET", "/api/shipments/tracking/"+number, nil, "", 200)
	if tracked["customer"] != nil {
		t.Fatal("public data leak")
	}
	request("GET", "/api/shipments/tracking/UNKNOWN", nil, "", 404)
	for _, query := range []string{"?status=delivered", "?carrier_id=" + fmt.Sprint(int(carrier["id"].(float64))), "?search=Updated%20Customer", "?status=delivered&search=Updated%20Customer", "?page=1000"} {
		request("GET", "/api/shipments"+query, nil, token, 200)
	}
	for _, endpoint := range []string{"/health", "/ready", "/api/customers", "/api/carriers", "/api/routes"} {
		request("GET", endpoint, nil, token, 200)
	}
	request("POST", "/api/carriers", map[string]interface{}{"name": "Duplicate", "code": "TEST", "historical_delay_rate": .1}, token, 409)
	request("POST", "/api/routes", map[string]interface{}{"origin": "A", "destination": "B", "distance_km": -1, "estimated_hours": 1}, token, 400)
	// Verify exact delivery counts/rates rather than only checking successful HTTP responses.
	_, err = db.Exec("UPDATE shipments SET actual_delivery=expected_delivery-interval '1 hour' WHERE id=$1", id)
	if err != nil {
		t.Fatal(err)
	}
	performance := request("GET", "/api/carriers/"+fmt.Sprint(int(carrier["id"].(float64)))+"/performance", nil, token, 200)
	if performance["on_time_rate"] != float64(1) {
		t.Fatal("on-time rate", performance)
	}
	request("POST", "/api/auth/login", map[string]string{"email": "admin@routewise.com", "password": "wrong"}, "", 401)
}
