import { AlertTriangle,Clock,PackageCheck,RefreshCw,Truck } from 'lucide-react';
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarrierChart,PerformanceChart,RiskChart,StatusChart } from '../components/charts';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card,CardBody } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';
import type { Alert,DashboardSummary,RiskSummary } from '../types';
import { cn,formatRelativeTime } from '../utils/helpers';

const KPI_CARDS = [
  { key: 'total_shipments', label: 'Total Shipments', icon: Truck, color: 'text-chart-indigo', bg: 'bg-[#F4F6F9]', filter: undefined },
  { key: 'in_transit', label: 'In Transit', icon: Truck, color: 'text-chart-blue', bg: 'bg-[#F4F6F9]', filter: 'in_transit' },
  { key: 'delivered_today', label: 'Delivered Today', icon: PackageCheck, color: 'text-chart-emerald', bg: 'bg-[#F4F6F9]', filter: 'delivered' },
  { key: 'delayed', label: 'Delayed', icon: AlertTriangle, color: 'text-chart-coral', bg: 'bg-[#F4F6F9]', filter: 'delayed' },
];

export function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [statusChartData, setStatusChartData] = useState<{ data: { label: string; value: number }[] } | null>(null);
  const [performanceChartData, setPerformanceChartData] = useState<{ labels: string[]; on_time_rates: number[] } | null>(null);
  const [carrierChartData, setCarrierChartData] = useState<{ data: { label: string; value: number }[] } | null>(null);
  const [riskChartData, setRiskChartData] = useState<{ data: { label: string; value: number }[] } | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const requests = [
        ['Shipment totals', dashboardApi.getSummary().then(({ data }) => setSummary(data))],
        ['Risk totals', dashboardApi.getRiskSummary().then(({ data }) => setRiskSummary(data))],
        ['Shipment status', dashboardApi.getStatusChart().then(({ data }) => setStatusChartData(data))],
        ['Delivery performance', dashboardApi.getPerformanceChart().then(({ data }) => setPerformanceChartData(data))],
        ['Carrier performance', dashboardApi.getCarrierChart().then(({ data }) => setCarrierChartData(data))],
        ['Risk distribution', dashboardApi.getRiskChart().then(({ data }) => setRiskChartData(data))],
        ['Recent alerts', dashboardApi.getRecentAlerts().then(({ data }) => setRecentAlerts(data))],
      ] as const;
      const results = await Promise.allSettled(requests.map(([, request]) => request));
      const failed = requests.filter((_, index) => results[index].status === 'rejected');
      setError(failed.length ? `Could not load ${failed.map(([label]) => label.toLowerCase()).join(', ')}. Use Refresh to retry.` : null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-500">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your logistics operations</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} loading={isLoading}>
          <RefreshCw className={isLoading ? 'animate-spin' : ''} size={16} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-600">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_CARDS.map((card) => {
          const value = summary ? summary[card.key as keyof DashboardSummary] : '—';
          return (
            <Card
              key={card.key}
              className="card cursor-pointer hover:shadow-lg transition-all duration-300"
              onClick={() => navigate(`/shipments${card.filter ? `?status=${card.filter}` : ''}`)}
            >
              <CardBody className="flex items-start justify-between p-6">
                <div>
                  <p className="kpi-label text-slate-400 font-medium">{card.label}</p>
                  <p className="kpi-value text-ink-900 mt-2">{value}</p>
                </div>
                <div className={cn('kpi-icon rounded-full', card.bg)}>
                  <card.icon className={cn('w-5 h-5', card.color)} />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { key: 'high', label: 'High Risk', color: 'danger', icon: AlertTriangle, risk: 'HIGH' },
          { key: 'medium', label: 'Medium Risk', color: 'warning', icon: AlertTriangle, risk: 'MEDIUM' },
          { key: 'low', label: 'Low Risk', color: 'success', icon: Clock, risk: 'LOW' },
        ].map((risk) => (
          <Card
            key={risk.key}
            className={cn("card cursor-pointer hover:shadow-lg transition-all duration-300", risk.key === 'high' ? "card-accent-mesh" : "")}
            onClick={() => navigate(`/shipments?risk_level=${risk.risk}`)}
          >
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-full', risk.key === 'high' ? 'bg-white/20' : 'bg-[#F4F6F9]')}>
                  <risk.icon className={cn('w-6 h-6', risk.key === 'high' ? 'text-white' : `text-${risk.color}-600`)} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">{risk.label}</p>
                  <p className="text-2xl font-bold text-ink-900">{riskSummary?.[risk.key as keyof RiskSummary] || 0}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardBody className="p-5 pt-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Status</h3>
            <StatusChart data={statusChartData?.data || []} height={280} />
          </CardBody>
        </Card>

        {/* Delivery Performance */}
        <Card>
          <CardBody className="p-5 pt-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">On-Time Delivery Performance</h3>
            <PerformanceChart data={performanceChartData || { labels: [], on_time_rates: [] }} height={280} />
          </CardBody>
        </Card>

        {/* Carrier Performance */}
        <Card className="lg:col-span-2">
          <CardBody className="p-5 pt-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Carrier Delay Rates</h3>
            <CarrierChart data={carrierChartData || { data: [] }} height={280} />
          </CardBody>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardBody className="p-5 pt-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
            <RiskChart data={riskChartData || { data: [] }} height={220} />
          </CardBody>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardBody className="p-5 pt-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
              <Badge variant="danger">{recentAlerts.length}</Badge>
            </div>
            {recentAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent alerts</p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 rounded-lg border-l-4',
                      alert.type === 'high_risk' && 'bg-danger-50 border-danger-500',
                      alert.type === 'overdue' && 'bg-warning-50 border-warning-500',
                      alert.type === 'delayed' && 'bg-danger-50 border-danger-500'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {alert.shipment_tracking_number} • {formatRelativeTime(alert.created_at)}
                        </p>
                      </div>
                      {!alert.is_acknowledged && (
                        <Badge variant="warning" className="text-xs">Unread</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
