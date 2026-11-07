package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5/pgconn"
	"io"
	"log"
	"math"
	"net/http"
	"net/mail"
	"routewise/internal/middleware"
	"routewise/internal/models"
	"routewise/internal/services"
	"strconv"
	"strings"
	"time"
)

// Routes stay compatible with the existing React API client.
func NewRouter(db *sql.DB) http.Handler {
	auth := services.NewAuthService(db)
	customers := services.NewCustomerService(db)
	carriers := services.NewCarrierService(db)
	routes := services.NewRouteService(db)
	shipments := services.NewShipmentService(db)
	mux := http.NewServeMux()
	admin := func(pattern string, handler http.HandlerFunc) {
		mux.Handle(pattern, middleware.JWTAuth(middleware.AdminOnly(handler)))
	}
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]string{"status": "healthy", "app": "RouteWise"}, 200)
	})
	mux.HandleFunc("GET /ready", func(w http.ResponseWriter, r *http.Request) {
		if err := db.PingContext(r.Context()); err != nil {
			writeJSONError(w, 503, "Database unavailable")
			return
		}
		writeJSON(w, map[string]string{"status": "ready"}, 200)
	})
	mux.HandleFunc("POST /api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var body struct{ Email, Password string }
		if !decode(w, r, &body) {
			return
		}
		user, err := auth.Authenticate(strings.ToLower(strings.TrimSpace(body.Email)), body.Password)
		if err != nil {
			if err.Error() == "invalid email or password" {
				writeJSONError(w, 401, "Invalid email or password")
			} else {
				fail(w, err)
			}
			return
		}
		token, err := auth.CreateToken(user)
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, map[string]string{"access_token": token, "token_type": "bearer"}, 200)
	})
	mux.HandleFunc("POST /api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		var body struct{ Name, Email, Password string }
		if !decode(w, r, &body) {
			return
		}
		body.Email = strings.ToLower(strings.TrimSpace(body.Email))
		body.Name = strings.TrimSpace(body.Name)
		address, err := mail.ParseAddress(body.Email)
		if err != nil || address.Address != body.Email || len(body.Email) > 150 || body.Name == "" || len(body.Name) > 100 || len(body.Password) < 8 || len(body.Password) > 72 {
			writeJSONError(w, 400, "Valid name, email and password of 8–72 bytes required")
			return
		}
		user, err := auth.Register(body.Name, body.Email, body.Password, "customer")
		if err != nil {
			if err.Error() == "email already registered" {
				writeJSONError(w, 409, "Email already registered")
			} else {
				fail(w, err)
			}
			return
		}
		writeJSON(w, user, 201)
	})
	mux.Handle("GET /api/auth/me", middleware.JWTAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := r.Context().Value(middleware.UserKey).(*middleware.UserContext)
		result, err := auth.GetByID(user.ID)
		respond(w, result, err, 200)
	})))
	admin("GET /api/customers", func(w http.ResponseWriter, r *http.Request) {
		page, size := pagination(r)
		list, total, err := customers.List(r.URL.Query().Get("search"), page, size)
		w.Header().Set("X-Total-Count", strconv.Itoa(total))
		respond(w, list, err, 200)
	})
	admin("POST /api/customers", func(w http.ResponseWriter, r *http.Request) {
		var b struct{ Name, Email, Phone, Address, City, Country string }
		if !decode(w, r, &b) {
			return
		}
		if !bounded(b.Name, 150) || len(b.Email) > 150 || len(b.Phone) > 30 || len(b.City) > 100 || len(b.Country) > 100 {
			writeJSONError(w, 400, "Valid customer name and field lengths required")
			return
		}
		if b.Country == "" {
			b.Country = "Japan"
		}
		id, err := customers.Create(b.Name, b.Email, b.Phone, b.Address, b.City, b.Country)
		if err != nil {
			fail(w, err)
			return
		}
		value, err := customers.GetByID(id)
		respond(w, value, err, 201)
	})
	admin("GET /api/customers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		v, e := customers.GetByID(id)
		respond(w, v, e, 200)
	})
	admin("PUT /api/customers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var b struct{ Name, Email, Phone, Address, City, Country *string }
		if !decode(w, r, &b) {
			return
		}
		if !optionalText(b.Name, 150, true) || !optionalText(b.Email, 150, false) || !optionalText(b.Phone, 30, false) || !optionalText(b.City, 100, false) || !optionalText(b.Country, 100, false) {
			writeJSONError(w, 400, "Invalid customer fields")
			return
		}
		v, e := customers.Update(id, b.Name, b.Email, b.Phone, b.Address, b.City, b.Country)
		respond(w, v, e, 200)
	})
	admin("DELETE /api/customers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		found, e := customers.Delete(id)
		deleted(w, found, e)
	})
	admin("GET /api/carriers", func(w http.ResponseWriter, r *http.Request) {
		page, size := pagination(r)
		v, total, e := carriers.List(r.URL.Query().Get("search"), page, size)
		w.Header().Set("X-Total-Count", strconv.Itoa(total))
		respond(w, v, e, 200)
	})
	admin("POST /api/carriers", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Name, Code string
			Rate       float64 `json:"historical_delay_rate"`
		}
		if !decode(w, r, &b) {
			return
		}
		if !bounded(b.Name, 150) || !bounded(b.Code, 20) || !rateValid(b.Rate) {
			writeJSONError(w, 400, "Name, code and delay rate between 0 and 1 required")
			return
		}
		v, e := carriers.Create(b.Name, b.Code, b.Rate)
		respond(w, v, e, 201)
	})
	admin("GET /api/carriers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		v, e := carriers.GetByID(id)
		respond(w, v, e, 200)
	})
	admin("PUT /api/carriers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var b struct {
			Name, Code *string
			Rate       *float64 `json:"historical_delay_rate"`
		}
		if !decode(w, r, &b) {
			return
		}
		if !optionalText(b.Name, 150, true) || !optionalText(b.Code, 20, true) || (b.Rate != nil && !rateValid(*b.Rate)) {
			writeJSONError(w, 400, "Invalid carrier fields")
			return
		}
		v, e := carriers.Update(id, b.Name, b.Code, b.Rate)
		respond(w, v, e, 200)
	})
	admin("DELETE /api/carriers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		found, e := carriers.Delete(id)
		deleted(w, found, e)
	})
	admin("GET /api/carriers/{id}/performance", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		v, e := carriers.GetPerformance(id)
		respond(w, v, e, 200)
	})
	admin("GET /api/routes", func(w http.ResponseWriter, r *http.Request) {
		page, size := pagination(r)
		v, total, e := routes.List(r.URL.Query().Get("search"), page, size)
		w.Header().Set("X-Total-Count", strconv.Itoa(total))
		respond(w, v, e, 200)
	})
	admin("POST /api/routes", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Origin, Destination string
			Distance            int `json:"distance_km"`
			Hours               int `json:"estimated_hours"`
		}
		if !decode(w, r, &b) {
			return
		}
		if !bounded(b.Origin, 100) || !bounded(b.Destination, 100) || b.Distance < 1 || b.Hours < 1 {
			writeJSONError(w, 400, "Origin, destination, positive distance and transit hours required")
			return
		}
		v, e := routes.Create(b.Origin, b.Destination, b.Distance, b.Hours)
		respond(w, v, e, 201)
	})
	admin("GET /api/routes/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		v, e := routes.GetByID(id)
		respond(w, v, e, 200)
	})
	admin("PUT /api/routes/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var b struct {
			Origin, Destination *string
			Distance            *int `json:"distance_km"`
			Hours               *int `json:"estimated_hours"`
		}
		if !decode(w, r, &b) {
			return
		}
		if !optionalText(b.Origin, 100, true) || !optionalText(b.Destination, 100, true) || (b.Distance != nil && *b.Distance < 1) || (b.Hours != nil && *b.Hours < 1) {
			writeJSONError(w, 400, "Invalid route fields")
			return
		}
		v, e := routes.Update(id, b.Origin, b.Destination, b.Distance, b.Hours)
		respond(w, v, e, 200)
	})
	admin("DELETE /api/routes/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		found, e := routes.Delete(id)
		deleted(w, found, e)
	})

	// Basic public tracking contains no customer contact details or internal analytics.
	track := func(w http.ResponseWriter, r *http.Request) {
		sh, err := shipments.GetByTrackingNumber(r.PathValue("number"))
		if err != nil {
			fail(w, err)
			return
		}
		for i := range sh.Events {
			sh.Events[i].Description = nil
		}
		writeJSON(w, map[string]interface{}{
			"id": sh.ID, "tracking_number": sh.TrackingNumber, "status": sh.Status, "priority": sh.Priority,
			"route": sh.Route, "carrier": map[string]string{"name": sh.Carrier.Name, "code": sh.Carrier.Code},
			"package_weight": sh.PackageWeight, "expected_delivery": sh.ExpectedDelivery, "actual_delivery": sh.ActualDelivery,
			"created_at": sh.CreatedAt, "events": sh.Events,
		}, 200)
	}
	outer := http.NewServeMux()
	outer.HandleFunc("GET /api/shipments/tracking/{number}", track)
	mux.HandleFunc("GET /api/track/{number}", track)
	admin("GET /api/shipments", func(w http.ResponseWriter, r *http.Request) {
		page, size := pagination(r)
		q := r.URL.Query()
		carrier, err := strconv.Atoi(q.Get("carrier_id"))
		if q.Get("carrier_id") != "" && (err != nil || carrier < 1) {
			writeJSONError(w, 400, "Invalid carrier filter")
			return
		}
		status := q.Get("status")
		if status != "" {
			if _, ok := models.ValidTransitions[models.ShipmentStatus(status)]; !ok {
				writeJSONError(w, 400, "Invalid status filter")
				return
			}
		}
		v, total, e := shipments.List(models.ShipmentFilters{Search: q.Get("search"), Status: status, CarrierID: carrier}, page, size)
		respond(w, paginated(v, total, page, size), e, 200)
	})
	admin("POST /api/shipments", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Customer int       `json:"customer_id"`
			Carrier  int       `json:"carrier_id"`
			Route    int       `json:"route_id"`
			Weight   float64   `json:"package_weight"`
			Priority string    `json:"priority"`
			Tracking string    `json:"tracking_number"`
			Expected time.Time `json:"expected_delivery"`
		}
		if !decode(w, r, &b) {
			return
		}
		if b.Priority == "" {
			b.Priority = "normal"
		}
		if math.IsNaN(b.Weight) || math.IsInf(b.Weight, 0) || b.Weight >= 1000000 {
			writeJSONError(w, 400, "Invalid package weight")
			return
		}
		v, e := shipments.Create(b.Customer, b.Carrier, b.Route, b.Weight, b.Priority, b.Tracking, b.Expected)
		respond(w, v, e, 201)
	})
	admin("GET /api/shipments/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		v, e := shipments.GetByID(id)
		respond(w, v, e, 200)
	})
	admin("PUT /api/shipments/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var b struct {
			Status, Priority *string
			Expected         *time.Time `json:"expected_delivery"`
		}
		if !decode(w, r, &b) {
			return
		}
		v, e := shipments.Update(id, b.Status, b.Priority, b.Expected)
		respond(w, v, e, 200)
	})
	admin("PUT /api/shipments/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var b struct {
			Status                models.ShipmentStatus
			Location, Description string
		}
		if !decode(w, r, &b) {
			return
		}
		if len(b.Location) > 150 || len(b.Description) > 2000 {
			writeJSONError(w, 400, "Event text too long")
			return
		}
		v, e := shipments.UpdateStatus(id, b.Status, b.Location, b.Description)
		respond(w, v, e, 200)
	})
	admin("POST /api/shipments/{id}/events", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var b struct {
			Status                models.ShipmentStatus
			Location, Description string
		}
		if !decode(w, r, &b) {
			return
		}
		if len(b.Location) > 150 || len(b.Description) > 2000 {
			writeJSONError(w, 400, "Event text too long")
			return
		}
		if err := shipments.AddEvent(id, b.Status, b.Location, b.Description); err != nil {
			fail(w, err)
			return
		}
		v, e := shipments.GetEvents(id)
		respond(w, v, e, 201)
	})
	outer.Handle("/", mux)
	return outer
}
func bounded(s string, max int) bool { return strings.TrimSpace(s) != "" && len(s) <= max }
func optionalText(s *string, max int, required bool) bool {
	return s == nil || (len(*s) <= max && (!required || strings.TrimSpace(*s) != ""))
}
func rateValid(x float64) bool { return !math.IsNaN(x) && !math.IsInf(x, 0) && x >= 0 && x <= 1 }
func positive(value string, def, max int) int {
	n, e := strconv.Atoi(value)
	if e != nil || n < 1 {
		return def
	}
	if n > max {
		return max
	}
	return n
}
func pagination(r *http.Request) (int, int) {
	return positive(r.URL.Query().Get("page"), 1, 100000), positive(r.URL.Query().Get("page_size"), 20, 1000)
}
func pathID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, e := strconv.Atoi(r.PathValue("id"))
	if e != nil || id < 1 {
		writeJSONError(w, 400, "Invalid ID")
		return 0, false
	}
	return id, true
}
func paginated(items interface{}, total, page, size int) map[string]interface{} {
	return map[string]interface{}{"items": items, "total": total, "page": page, "page_size": size, "total_pages": (total + size - 1) / size}
}
func decode(w http.ResponseWriter, r *http.Request, value interface{}) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(value); err != nil {
		writeJSONError(w, 400, "Invalid JSON request")
		return false
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeJSONError(w, 400, "One JSON object required")
		return false
	}
	return true
}
func writeJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("encode response: %v", err)
	}
}
func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, map[string]string{"detail": message}, status)
}
func respond(w http.ResponseWriter, value interface{}, err error, status int) {
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, value, status)
}
func deleted(w http.ResponseWriter, found bool, err error) {
	if err != nil {
		fail(w, err)
		return
	}
	if !found {
		fail(w, sql.ErrNoRows)
		return
	}
	w.WriteHeader(204)
}
func fail(w http.ResponseWriter, err error) {
	var pg *pgconn.PgError
	switch {
	case errors.Is(err, sql.ErrNoRows):
		writeJSONError(w, 404, "Record not found")
	case errors.Is(err, services.ErrInvalid):
		writeJSONError(w, 400, err.Error())
	case errors.As(err, &pg):
		switch pg.Code {
		case "23505":
			writeJSONError(w, 409, "A record with this unique value already exists")
		case "23503":
			writeJSONError(w, 409, "Related record is missing or still in use")
		case "22001", "22003", "23514", "23502":
			writeJSONError(w, 400, "Invalid field value")
		default:
			log.Printf("database: %v", err)
			writeJSONError(w, 500, "Database operation failed")
		}
	default:
		log.Printf("request: %v", err)
		writeJSONError(w, 500, "Request failed")
	}
}
