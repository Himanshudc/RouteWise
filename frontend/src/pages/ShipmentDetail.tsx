import {
AlertTriangle,
ArrowLeft,
Calendar,
CheckCircle,
Clock,
MapPin,
Package,
PackageCheck,
RefreshCw,
Scale,
Truck,
X,
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';
import { Badge,Button,Input } from '../components/ui';
import { Card,CardBody,CardHeader } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { shipmentsApi } from '../services/api';
import type { ShipmentDetail,ShipmentStatus } from '../types';
import { cn,formatDateTime,getPriorityBadgeClass,getPriorityLabel,getStatusBadgeClass,getStatusLabel } from '../utils/helpers';

const STATUS_STEPS: { key: ShipmentStatus; label: string; icon: typeof Truck }[] = [
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: PackageCheck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export function ShipmentDetail() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '' as ShipmentStatus,
    location: '',
    description: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const fetchData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const { data } = await shipmentsApi.get(parseInt(id));
      setShipment(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load shipment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setIsUpdating(true);

    try {
      await shipmentsApi.updateStatus(shipment!.id, statusForm);
      setShowStatusUpdate(false);
      fetchData();
    } catch (err: any) {
      setUpdateError(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStepIndex = (status: ShipmentStatus): number => {
    const stepOrder: ShipmentStatus[] = ['processing', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered'];
    return stepOrder.indexOf(status);
  };

  const isStepComplete = (stepKey: ShipmentStatus, currentStatus: ShipmentStatus): boolean => {
    const currentIndex = getCurrentStepIndex(currentStatus);
    const stepIndex = getCurrentStepIndex(stepKey);
    if (currentStatus === 'delayed') {
      // For delayed, show up to in_transit as complete
      return stepIndex <= getCurrentStepIndex('in_transit');
    }
    if (currentStatus === 'cancelled') return false;
    return stepIndex <= currentIndex;
  };

  const isStepCurrent = (stepKey: ShipmentStatus, currentStatus: ShipmentStatus): boolean => {
    if (currentStatus === 'delayed') return stepKey === 'in_transit';
    if (currentStatus === 'cancelled') return false;
    return stepKey === currentStatus;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Unable to load shipment</h2>
        <p className="text-gray-500 mt-1">{error || 'Shipment not found'}</p>
        <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusForm({ status: shipment.status, location: '', description: '' });
                setShowStatusUpdate(true);
              }}
            >
              Update Status
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-600">
          {error}
        </div>
      )}

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 gap-6">
        {/* Left: Shipment Info */}
        <Card className="">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Shipment {shipment.tracking_number}
                </h2>
                <p className="text-gray-500 mt-0.5">{shipment.customer.name}</p>
              </div>
              <Badge variant={getStatusBadgeClass(shipment.status).replace('badge-', '') as any} className="text-sm px-3 py-1">
                {getStatusLabel(shipment.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Route */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Route</h3>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900">{shipment.route.origin}</p>
                    <p className="text-sm text-gray-500">→ {shipment.route.destination}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {shipment.route.distance_km} km • {shipment.route.estimated_hours}h estimated
                    </p>
                  </div>
                </div>
              </div>

              {/* Carrier */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Carrier</h3>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Truck className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900">{shipment.carrier.name}</p>
                    <p className="text-sm text-gray-500">Code: {shipment.carrier.code}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Historical delay rate: {(shipment.carrier.historical_delay_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Schedule</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Expected Delivery</p>
                      <p className="font-medium text-gray-900">{formatDateTime(shipment.expected_delivery)}</p>
                    </div>
                  </div>
                  {shipment.actual_delivery && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-success-500" />
                      <div>
                        <p className="text-xs text-gray-500">Actual Delivery</p>
                        <p className="font-medium text-gray-900">{formatDateTime(shipment.actual_delivery)}</p>
                      </div>
                    </div>
                  )}
                  {shipment.created_at && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="font-medium text-gray-900">{formatDateTime(shipment.created_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Scale className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Weight</p>
                      <p className="font-medium text-gray-900">{shipment.package_weight} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Priority</p>
                      <Badge variant={getPriorityBadgeClass(shipment.priority).replace('badge-', '') as any}>
                        {getPriorityLabel(shipment.priority)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Shipment Timeline</h3>
        </CardHeader>
        <CardBody>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            {STATUS_STEPS.map((step) => {
              const isComplete = isStepComplete(step.key, shipment.status);
              const isCurrent = isStepCurrent(step.key, shipment.status);


              // Find matching event
              const event = shipment.events.find((e) => e.status === step.key);
              const eventTime = event ? formatDateTime(event.timestamp) : null;
              const eventLocation = event?.location;
              const eventDesc = event?.description;

              return (
                <div key={step.key} className="status-timeline-step relative pb-6 last:pb-0">
                  {/* Dot */}
                  <div
                    className={cn(
                      'status-timeline-dot',
                      isComplete ? 'status-timeline-dot-complete' : '',
                      isCurrent && !isComplete ? 'status-timeline-dot-active' : '',
                      !isComplete && !isCurrent ? 'status-timeline-dot-pending' : ''
                    )}
                    style={{
                      backgroundColor: isComplete ? '#10b981' : isCurrent ? '#3b82f6' : '#e2e8f0',
                      borderColor: isComplete ? '#10b981' : isCurrent ? '#3b82f6' : '#e2e8f0',
                    }}
                  >
                    {isComplete && <CheckCircle className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                  </div>

                  {/* Content */}
                  <div className="ml-10 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={cn('font-medium', isComplete || isCurrent ? 'text-gray-900' : 'text-gray-400')}>
                        {step.label}
                      </h4>
                      {isCurrent && !isComplete && (
                        <Badge variant="info" className="text-xs">Current</Badge>
                      )}
                    </div>
                    {eventTime && (
                      <p className="text-sm text-gray-500 mt-0.5">{eventTime}</p>
                    )}
                    {(eventLocation || eventDesc) && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        {eventLocation && <span className="font-medium">{eventLocation}</span>}
                        {eventLocation && eventDesc && <span className="mx-1">•</span>}
                        {eventDesc && <span>{eventDesc}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Delayed state indicator */}
            {shipment.status === 'delayed' && (
              <div className="status-timeline-step relative">
                <div className="status-timeline-dot status-timeline-dot-active" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} />
                <div className="ml-10">
                  <h4 className="font-medium text-danger-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Delayed
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5">Shipment is delayed - requires attention</p>
                </div>
              </div>
            )}

            {/* Cancelled state indicator */}
            {shipment.status === 'cancelled' && (
              <div className="status-timeline-step relative">
                <div className="status-timeline-dot" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                  <X className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="ml-10">
                  <h4 className="font-medium text-danger-600">Cancelled</h4>
                  <p className="text-sm text-gray-500 mt-0.5">Shipment has been cancelled</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Events History */}
      {shipment.events.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Event History</h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-200">
              {shipment.events
                .slice()
                .reverse()
                .map((event) => (
                  <div key={event.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-28 text-center text-gray-400">
                        <Badge variant={getStatusBadgeClass(event.status).replace('badge-', '') as any} className="text-xs">
                          {getStatusLabel(event.status)}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{formatDateTime(event.timestamp)}</p>
                        </div>
                        {event.location && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 inline mr-1" /> {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Update Status Modal */}
      <Modal
        isOpen={showStatusUpdate}
        onClose={() => setShowStatusUpdate(false)}
        title="Update Shipment Status"
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          {updateError && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-md text-danger-600 text-sm">
              {updateError}
            </div>
          )}

          <div>
            <label className="label">New Status</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as ShipmentStatus })}
              className="input"
              required
            >
              <option value="">Select status</option>
              <option value="dispatched">Dispatched</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="delayed">Delayed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <Input
              label="Location (optional)"
              value={statusForm.location}
              onChange={(e) => setStatusForm({ ...statusForm, location: e.target.value })}
              placeholder="e.g., Tokyo Distribution Center"
            />
          </div>

          <div>
            <Input
              label="Description (optional)"
              value={statusForm.description}
              onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
              placeholder="e.g., Departed from warehouse"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowStatusUpdate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isUpdating}>
              Update Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}