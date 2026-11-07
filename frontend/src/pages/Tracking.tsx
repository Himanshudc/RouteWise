import {
AlertTriangle,
CheckCircle,
MapPin,
Package,
PackageCheck,
Search,
Truck,
X
} from 'lucide-react';
import { useState } from 'react';
import { Badge,Button } from '../components/ui';
import { Card,CardBody,CardHeader } from '../components/ui/Card';
import { shipmentsApi } from '../services/api';
import type { ShipmentDetail,ShipmentStatus } from '../types';
import { cn,formatDateTime,getPriorityBadgeClass,getStatusBadgeClass,getStatusLabel } from '../utils/helpers';

const STATUS_STEPS: { key: ShipmentStatus; label: string; icon: typeof Truck }[] = [
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: PackageCheck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export function Tracking() {

  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setError(null);
    setShipment(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await shipmentsApi.track(trackingNumber.trim());
      setShipment(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Shipment not found');
      setShipment(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setTrackingNumber('');
    setShipment(null);
    setError(null);
    setHasSearched(false);
  };

  const getCurrentStepIndex = (status: ShipmentStatus): number => {
    const stepOrder: ShipmentStatus[] = ['processing', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered'];
    return stepOrder.indexOf(status);
  };

  const isStepComplete = (stepKey: ShipmentStatus, currentStatus: ShipmentStatus): boolean => {
    const currentIndex = getCurrentStepIndex(currentStatus);
    const stepIndex = getCurrentStepIndex(stepKey);
    if (currentStatus === 'delayed') {
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

  return (
    <div className="min-h-screen bg-bg-primary py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Track Your Shipment</h1>
          <p className="text-gray-500 mt-2">Enter your tracking number to view status and delivery estimates</p>
        </div>

        {/* Search Form */}
        <Card>
          <CardBody className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number (e.g., SHP-1024)"
                  className="input pl-10 text-lg py-3"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" size="lg" loading={isLoading} className="whitespace-nowrap">
                Track
              </Button>
              {hasSearched && (
                <Button type="button" variant="secondary" size="lg" onClick={handleClear}>
                  Clear
                </Button>
              )}
            </form>
          </CardBody>
        </Card>

        {error && (
          <Card className="border-danger-200">
            <CardBody className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-danger-500 flex-shrink-0" />
              <p className="text-danger-600">{error}</p>
            </CardBody>
          </Card>
        )}

        {shipment && (
          <>
            {/* Main Shipment Info */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Shipment {shipment.tracking_number}
                    </h2>
                    <p className="text-gray-500 mt-0.5">Shipment tracking</p>
                  </div>
                  <Badge variant={getStatusBadgeClass(shipment.status).replace('badge-', '') as any} className="text-sm px-3 py-1">
                    {getStatusLabel(shipment.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Route */}
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Route</h3>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-medium text-gray-900">{shipment.route.origin}</p>
                        <div className="flex items-center gap-2 my-1">
                          <div className="flex-1 h-0.5 bg-gray-300" />
                          <Truck className="w-5 h-5 text-gray-400" />
                          <div className="flex-1 h-0.5 bg-gray-300" />
                        </div>
                        <p className="text-lg font-medium text-gray-900">{shipment.route.destination}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{shipment.route.distance_km} km</p>
                        <p>{shipment.route.estimated_hours}h estimated</p>
                      </div>
                    </div>
                  </div>

                  {/* Carrier */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Carrier</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-accent-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{shipment.carrier.name}</p>
                          <p className="text-sm text-gray-500">{shipment.carrier.code}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Schedule</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Expected Delivery</p>
                        <p className="font-medium text-gray-900 mt-1">{formatDateTime(shipment.expected_delivery)}</p>
                      </div>
                      {shipment.actual_delivery && (
                        <div className="p-4 bg-success-50 rounded-lg">
                          <p className="text-xs text-success-600">Actual Delivery</p>
                          <p className="font-medium text-gray-900 mt-1">{formatDateTime(shipment.actual_delivery)}</p>
                        </div>
                      )}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Shipment Created</p>
                        <p className="font-medium text-gray-900 mt-1">{formatDateTime(shipment.created_at)}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Priority</p>
                        <Badge variant={getPriorityBadgeClass(shipment.priority).replace('badge-', '') as any} className="mt-1">
                          {shipment.priority.charAt(0).toUpperCase() + shipment.priority.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Package</h3>
                    <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-medium text-gray-900">{shipment.package_weight} kg</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Shipment Timeline</h3>
              </CardHeader>
              <CardBody>
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                  {STATUS_STEPS.map((step) => {
                    const isComplete = isStepComplete(step.key, shipment.status);
                    const isCurrent = isStepCurrent(step.key, shipment.status);


                    const event = shipment.events.find((e) => e.status === step.key);
                    const eventTime = event ? formatDateTime(event.timestamp) : null;
                    const eventLocation = event?.location;
                    const eventDesc = event?.description;

                    return (
                      <div key={step.key} className="status-timeline-step relative pb-6 last:pb-0">
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

                  {shipment.status === 'delayed' && (
                    <div className="status-timeline-step relative">
                      <div className="status-timeline-dot status-timeline-dot-active" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} />
                      <div className="ml-10">
                        <h4 className="font-medium text-danger-600 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Delayed
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">Shipment is delayed - contact carrier for details</p>
                      </div>
                    </div>
                  )}

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

            {/* Recent Events */}
            {shipment.events.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Recent Updates</h3>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-gray-200">
                    {shipment.events
                      .slice()
                      .reverse()
                      .slice(0, 10)
                      .map((event) => (
                        <div key={event.id} className="p-4 hover:bg-gray-50">
                          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                            <div className="w-28 shrink-0">
                              <Badge variant={getStatusBadgeClass(event.status).replace('badge-', '') as any} className="whitespace-nowrap text-xs">
                                {getStatusLabel(event.status)}
                              </Badge>
                            </div>
                            <div className="min-w-[10rem] flex-1">
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
          </>
        )}

        {!hasSearched && !shipment && !error && (
          <Card>
            <CardBody className="p-12 text-center">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Enter a tracking number</h3>
              <p className="text-gray-500">Find your shipment status, and expected delivery</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}