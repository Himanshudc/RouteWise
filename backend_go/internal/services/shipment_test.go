package services

import (
	"routewise/internal/models"
	"testing"
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
