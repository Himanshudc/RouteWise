package services

import (
	"routewise/internal/models"
	"testing"
	"time"
)

func TestAllStatusTransitions(t *testing.T) {
	svc := NewShipmentService(nil)
	states := []models.ShipmentStatus{models.StatusProcessing, models.StatusDispatched, models.StatusInTransit, models.StatusOutForDelivery, models.StatusDelivered, models.StatusDelayed, models.StatusCancelled}
	allowed := map[[2]models.ShipmentStatus]bool{
		{"processing", "dispatched"}: true, {"processing", "cancelled"}: true,
		{"dispatched", "in_transit"}: true, {"dispatched", "cancelled"}: true,
		{"in_transit", "out_for_delivery"}: true, {"in_transit", "delayed"}: true, {"in_transit", "cancelled"}: true,
		{"out_for_delivery", "delivered"}: true, {"delayed", "in_transit"}: true, {"delayed", "cancelled"}: true,
	}
	for _, from := range states {
		for _, to := range states {
			if svc.ValidateTransition(from, to) != allowed[[2]models.ShipmentStatus{from, to}] {
				t.Errorf("%s -> %s", from, to)
			}
		}
	}

	if svc.ValidateTransition("unknown", models.StatusDelivered) {
		t.Fatal("unknown status accepted")
	}
}

func TestShipmentRiskUsesDeliveryDeadline(t *testing.T) {
	now := time.Now()
	for _, tc := range []struct {
		name               string
		elapsed, remaining time.Duration
		status             models.ShipmentStatus
		want               string
	}{
		{"on schedule", time.Hour, 12 * time.Hour, models.StatusInTransit, "LOW"},
		{"past estimate", 12 * time.Hour, 4 * time.Hour, models.StatusInTransit, "MEDIUM"},
		{"approaching deadline", time.Hour, time.Hour, models.StatusInTransit, "MEDIUM"},
		{"overdue", time.Hour, -time.Hour, models.StatusInTransit, "HIGH"},
		{"marked delayed", time.Hour, 4 * time.Hour, models.StatusDelayed, "HIGH"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			sh := &models.Shipment{Status: tc.status, ExpectedDelivery: now.Add(tc.remaining),
				Route: &models.Route{EstimatedHours: 10}, Carrier: &models.Carrier{},
				Events: []models.ShipmentEvent{{Status: models.StatusDispatched, Timestamp: now.Add(-tc.elapsed)}}}
			if got := (&ShipmentService{}).score(sh).RiskLevel; got != tc.want {
				t.Fatalf("risk = %s, want %s", got, tc.want)
			}
		})
	}
}
