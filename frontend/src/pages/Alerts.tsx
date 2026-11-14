import {
AlertTriangle,
CheckCircle,
ChevronLeft,
ChevronRight,
Clock,
Loader2,
X
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Badge,Button } from '../components/ui';
import { Card,CardBody } from '../components/ui/Card';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { alertsApi } from '../services/api';
import type { Alert } from '../types';
import { formatRelativeTime } from '../utils/helpers';

export function Alerts() {
  const { isAdmin } = useAuth();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [unacknowledgedOnly, setUnacknowledgedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await alertsApi.list({
        unacknowledged_only: unacknowledgedOnly,
        page,
        page_size: pageSize,
      });
      setAlerts(response.data.items);
      setTotal(response.data.total);
      setError(null);
    } catch (err: any) {
      setError('Failed to load alerts');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, unacknowledgedOnly]);

  const handleAcknowledge = async (alert: Alert) => {
    try {
      await alertsApi.acknowledge(alert.id);
      fetchAlerts();
    } catch (err) {
      window.alert('Failed to acknowledge alert');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getAlertTypeInfo = (type: string) => {
    switch (type) {
      case 'high_risk':
        return { label: 'High Risk', color: 'danger', icon: AlertTriangle };
      case 'overdue':
        return { label: 'Overdue', color: 'warning', icon: Clock };
      case 'delayed':
        return { label: 'Delayed', color: 'danger', icon: X };
      default:
        return { label: type, color: 'gray', icon: AlertTriangle };
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-500">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-500 mt-1">Monitor and acknowledge shipment alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unacknowledgedOnly}
              onChange={(e) => setUnacknowledgedOnly(e.target.checked)}
              className="w-4 h-4 text-accent-600 border-gray-300 rounded focus:ring-accent-500"
            />
            <span className="text-sm text-gray-600">Unacknowledged only</span>
          </label>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin w-8 h-8 text-primary-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-danger-500">{error}</div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <CheckCircle className="w-12 h-12 mb-2 text-success-500" />
              <p>No alerts found</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => {
                      const typeInfo = getAlertTypeInfo(alert.type);
                      const Icon = typeInfo.icon;
                      return (
                        <TableRow key={alert.id} className={alert.is_acknowledged ? 'bg-gray-50' : ''}>
                          <TableCell>
                            <Badge variant={typeInfo.color as any} className="gap-1">
                              <Icon className="w-3.5 h-3.5" />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-medium text-gray-900">
                              {alert.shipment_tracking_number}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{alert.message}</TableCell>
                          <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                            {formatRelativeTime(alert.created_at)}
                          </TableCell>
                          <TableCell>
                            {alert.is_acknowledged ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!alert.is_acknowledged && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAcknowledge(alert)}
                              >
                                Acknowledge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
