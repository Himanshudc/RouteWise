package services

import (
	"database/sql"
	"routewise/internal/models"
	"time"
)

type DashboardService struct{ db *sql.DB }

func NewDashboardService(db *sql.DB) *DashboardService { return &DashboardService{db: db} }
func (s *DashboardService) GetSummary() (map[string]int, error) {
	m := map[string]int{}
	var total, transit, today, delayed int
	err := s.db.QueryRow(`SELECT COUNT(*),COUNT(*) FILTER(WHERE lower(status::text)='in_transit'),
 COUNT(*) FILTER(WHERE lower(status::text)='delivered' AND actual_delivery>=date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'UTC')),
 COUNT(*) FILTER(WHERE lower(status::text)='delayed') FROM shipments`).Scan(&total, &transit, &today, &delayed)
	m["total_shipments"] = total
	m["in_transit"] = transit
	m["delivered_today"] = today
	m["delayed"] = delayed
	return m, err
}
func (s *DashboardService) GetRiskSummary() (map[string]int, error) {
	counts := map[string]int{"high": 0, "medium": 0, "low": 0}
	shipments, _, err := NewShipmentService(s.db).List(models.ShipmentFilters{}, 1, 1000000)
	if err != nil {
		return nil, err
	}
	for _, sh := range shipments {
		if sh.Status == models.StatusDispatched || sh.Status == models.StatusInTransit || sh.Status == models.StatusOutForDelivery || sh.Status == models.StatusDelayed {
			switch sh.RiskLevel {
			case "HIGH":
				counts["high"]++
			case "MEDIUM":
				counts["medium"]++
			default:
				counts["low"]++
			}
		}
	}
	return counts, nil
}

type Point struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}
type Chart struct {
	Data []Point `json:"data"`
}

func (s *DashboardService) GetStatusDistribution() (*Chart, error) {
	chart := &Chart{Data: []Point{}}
	rows, err := s.db.Query("SELECT lower(status::text),COUNT(*) FROM shipments GROUP BY 1 ORDER BY 1")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p Point
		if err = rows.Scan(&p.Label, &p.Value); err != nil {
			return nil, err
		}
		chart.Data = append(chart.Data, p)
	}
	return chart, rows.Err()
}
func (s *DashboardService) GetCarrierPerformance() (*Chart, error) {
	chart := &Chart{Data: []Point{}}
	rows, err := s.db.Query(`SELECT c.name,COALESCE(100.0*COUNT(s.id) FILTER(WHERE s.actual_delivery>s.expected_delivery)/NULLIF(COUNT(s.id),0),0)
 FROM carriers c LEFT JOIN shipments s ON s.carrier_id=c.id AND lower(s.status::text)='delivered' GROUP BY c.id,c.name ORDER BY c.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p Point
		if err = rows.Scan(&p.Label, &p.Value); err != nil {
			return nil, err
		}
		chart.Data = append(chart.Data, p)
	}
	return chart, rows.Err()
}
func (s *DashboardService) GetRiskDistribution() (*Chart, error) {
	counts, err := s.GetRiskSummary()
	if err != nil {
		return nil, err
	}
	return &Chart{Data: []Point{{"LOW", float64(counts["low"])}, {"MEDIUM", float64(counts["medium"])}, {"HIGH", float64(counts["high"])}}}, nil
}

type PerformanceChart struct {
	Labels []string  `json:"labels"`
	Rates  []float64 `json:"on_time_rates"`
}

func (s *DashboardService) GetPerformanceTrend(weeks int) (*PerformanceChart, error) {
	chart := &PerformanceChart{Labels: []string{}, Rates: []float64{}}
	rows, err := s.db.Query(`WITH weeks AS (SELECT generate_series(date_trunc('week',CURRENT_TIMESTAMP AT TIME ZONE 'UTC')-($1-1)*interval '1 week',date_trunc('week',CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),interval '1 week') AS start)
 SELECT w.start,COALESCE(100.0*COUNT(s.id) FILTER(WHERE s.actual_delivery<=s.expected_delivery)/NULLIF(COUNT(s.id),0),0)
 FROM weeks w LEFT JOIN shipments s ON lower(s.status::text)='delivered' AND s.actual_delivery>=w.start AND s.actual_delivery<w.start+interval '1 week'
 GROUP BY w.start ORDER BY w.start`, weeks)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var date time.Time
		var rate float64
		if err = rows.Scan(&date, &rate); err != nil {
			return nil, err
		}
		chart.Labels = append(chart.Labels, date.Format("Jan 02"))
		chart.Rates = append(chart.Rates, rate)
	}
	return chart, rows.Err()
}
