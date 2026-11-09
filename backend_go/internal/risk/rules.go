package risk

type Features struct {
	DistanceKm          int     `json:"distance_km"`
	PackageWeight       float64 `json:"package_weight"`
	CarrierDelayRate    float64 `json:"carrier_delay_rate"`
	EstimatedHours      int     `json:"estimated_hours"`
	Priority            int     `json:"priority"`
	CurrentTransitHours float64 `json:"current_transit_hours"`
	DayOfWeek           int     `json:"day_of_week"`
}
type Prediction struct {
	RiskLevel   string   `json:"risk_level"`
	Probability float64  `json:"probability"`
	Reasons     []string `json:"reasons"`
	Method      string   `json:"method"`
}

func Rules(f Features) Prediction {
	p := Prediction{RiskLevel: "LOW", Reasons: []string{"Within the expected transit time"}, Method: "rules"}
	if f.EstimatedHours > 0 && f.CurrentTransitHours > float64(f.EstimatedHours) {
		p.RiskLevel = "HIGH"
		p.Reasons = []string{"Transit time exceeds the route estimate"}
	} else if (f.EstimatedHours > 0 && f.CurrentTransitHours >= float64(f.EstimatedHours)*.8) || f.CarrierDelayRate > .25 {
		p.RiskLevel = "MEDIUM"
		p.Reasons = []string{"Approaching the transit estimate or carrier delay rate is above 25%"}
	}
	return p
}
