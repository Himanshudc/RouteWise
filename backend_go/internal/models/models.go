package models

import "time"

// User represents the users table.
type User struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// Customer represents the customers table.
type Customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email"`
	Phone     *string   `json:"phone"`
	Address   *string   `json:"address"`
	City      *string   `json:"city"`
	Country   string    `json:"country"`
	CreatedAt time.Time `json:"created_at"`
}

// Carrier represents the carriers table.
type Carrier struct {
	ID                  int       `json:"id"`
	Name                string    `json:"name"`
	Code                string    `json:"code"`
	HistoricalDelayRate float64   `json:"historical_delay_rate"`
	CreatedAt           time.Time `json:"created_at"`
}

// Route represents the routes table.
type Route struct {
	ID             int       `json:"id"`
	Origin         string    `json:"origin"`
	Destination    string    `json:"destination"`
	DistanceKm     int       `json:"distance_km"`
	EstimatedHours int       `json:"estimated_hours"`
	CreatedAt      time.Time `json:"created_at"`
}

// ShipmentStatus is the shipment lifecycle status.
type ShipmentStatus string

const (
	StatusProcessing     ShipmentStatus = "processing"
	StatusDispatched     ShipmentStatus = "dispatched"
	StatusInTransit      ShipmentStatus = "in_transit"
	StatusOutForDelivery ShipmentStatus = "out_for_delivery"
	StatusDelivered      ShipmentStatus = "delivered"
	StatusDelayed        ShipmentStatus = "delayed"
	StatusCancelled      ShipmentStatus = "cancelled"
)

// ShipmentPriority is the shipment priority level.
type ShipmentPriority string

const (
	PriorityLow    ShipmentPriority = "low"
	PriorityNormal ShipmentPriority = "normal"
	PriorityHigh   ShipmentPriority = "high"
)

// Shipment represents the shipments table.
type Shipment struct {
	ID               int              `json:"id"`
	TrackingNumber   string           `json:"tracking_number"`
	CustomerID       int              `json:"customer_id"`
	CarrierID        int              `json:"carrier_id"`
	RouteID          int              `json:"route_id"`
	PackageWeight    float64          `json:"package_weight"`
	Priority         ShipmentPriority `json:"priority"`
	Status           ShipmentStatus   `json:"status"`
	CreatedAt        time.Time        `json:"created_at"`
	ExpectedDelivery time.Time        `json:"expected_delivery"`
	ActualDelivery   *time.Time       `json:"actual_delivery,omitempty"`

	// Joined fields (populated by queries)
	Customer *Customer       `json:"customer,omitempty"`
	Carrier  *Carrier        `json:"carrier,omitempty"`
	Route    *Route          `json:"route,omitempty"`
	Events   []ShipmentEvent `json:"events,omitempty"`
}

// ShipmentEvent represents the shipment_events table.
type ShipmentEvent struct {
	ID          int            `json:"id"`
	ShipmentID  int            `json:"shipment_id"`
	Status      ShipmentStatus `json:"status"`
	Location    *string        `json:"location,omitempty"`
	Timestamp   time.Time      `json:"timestamp"`
	Description *string        `json:"description,omitempty"`
}

// ValidTransitions defines allowed status transitions.
var ValidTransitions = map[ShipmentStatus][]ShipmentStatus{
	StatusProcessing:     {StatusDispatched, StatusCancelled},
	StatusDispatched:     {StatusInTransit, StatusCancelled},
	StatusInTransit:      {StatusOutForDelivery, StatusDelayed, StatusCancelled},
	StatusOutForDelivery: {StatusDelivered},
	StatusDelayed:        {StatusInTransit, StatusCancelled},
	StatusDelivered:      {},
	StatusCancelled:      {},
}

// ShipmentFilters holds query filters for listing shipments.
type ShipmentFilters struct {
	Search     string
	Status     string
	CarrierID  int
	CustomerID int

	Page     int
	PageSize int
}
