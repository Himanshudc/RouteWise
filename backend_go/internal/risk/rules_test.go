package risk

import (
	"testing"
)

func TestRules(t *testing.T) {
	for _, tc := range []struct {
		name    string
		hours   float64
		carrier float64
		want    string
	}{
		{"early", 2, .1, "LOW"}, {"near estimate", 8, .1, "MEDIUM"}, {"over estimate", 11, .1, "HIGH"}, {"carrier history", 2, .3, "MEDIUM"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := Rules(Features{EstimatedHours: 10, CurrentTransitHours: tc.hours, CarrierDelayRate: tc.carrier})
			if p.RiskLevel != tc.want || p.Method != "rules" || len(p.Reasons) == 0 {
				t.Fatalf("unexpected assessment: %+v", p)
			}
		})
	}
}
