import {
ChevronLeft,
ChevronRight,
Plus,
Search
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link,useNavigate,useSearchParams } from 'react-router-dom';
import { Button,Input,Select } from '../components/ui';
import { Badge } from '../components/ui/Badge';
import { Card,CardBody } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { carriersApi,customersApi,routesApi,shipmentsApi } from '../services/api';
import type { Carrier,Customer,Route,ShipmentFilters,ShipmentListItem,ShipmentStatus } from '../types';
import { formatDate,getPriorityBadgeClass,getPriorityLabel,getStatusBadgeClass,getStatusLabel } from '../utils/helpers';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'processing', label: 'Processing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'cancelled', label: 'Cancelled' },
];


export function Shipments() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ShipmentFilters>({
    search: '',
    status: (searchParams.get('status') as ShipmentStatus) || undefined,
    carrier_id: undefined,
    page: 1,
    page_size: 20,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    tracking_number: '',
    customer_id: '',
    carrier_id: '',
    route_id: '',
    package_weight: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    expected_delivery: '',
  });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch data
  const fetchShipments = async () => {
    try {
      setIsLoading(true);
      const response = await shipmentsApi.list(filters);
      setShipments(response.data.items);
      setTotal(response.data.total);
      setPage(response.data.page);
      setError(null);
    } catch (err: any) {
      setError('Failed to load shipments');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCarriers = async () => {
    try {
      const response = await carriersApi.list();
      setCarriers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersApi.list();
      setCustomers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await routesApi.list();
      setRoutes(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-generate next serial tracking number when modal opens
  const openCreateModal = () => {
    setCreateForm((prev) => ({ ...prev, tracking_number: '' }));
    setShowCreateModal(true);
  };

  useEffect(() => {
    fetchShipments();
    fetchCarriers();
    fetchCustomers();
    fetchRoutes();
  }, [filters]);

  const handleFilterChange = (key: keyof ShipmentFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value || undefined);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / pageSize)) {
      setFilters((current) => ({ ...current, page: newPage }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      await shipmentsApi.create({
        tracking_number: createForm.tracking_number,
        customer_id: parseInt(createForm.customer_id),
        carrier_id: parseInt(createForm.carrier_id),
        route_id: parseInt(createForm.route_id),
        package_weight: parseFloat(createForm.package_weight),
        priority: createForm.priority,
        expected_delivery: new Date(createForm.expected_delivery).toISOString(),
      });
      setShowCreateModal(false);
      setCreateForm({
        tracking_number: '',
        customer_id: '',
        carrier_id: '',
        route_id: '',
        package_weight: '',
        priority: 'normal',
        expected_delivery: '',
      });
      fetchShipments();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create shipment');
    } finally {
      setIsCreating(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 mt-1">Manage and track all shipments</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Create Shipment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tracking number, customer..."
                value={filters.search || ''}
                onChange={handleSearch}
                className="input pl-10"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Select
                options={STATUS_OPTIONS}
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                placeholder="All Statuses"
                className="w-40"
              />

              <Select
                options={[
                  { value: '', label: 'All Carriers' },
                  ...carriers.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
                ]}
                value={filters.carrier_id ? String(filters.carrier_id) : ''}
                onChange={(e) => handleFilterChange('carrier_id', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="All Carriers"
                className="w-48"
              />

            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-danger-500">{error}</div>
          ) : shipments.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No shipments found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="hidden md:table-cell">Weight</TableHead>
                      <TableHead className="hidden sm:table-cell">Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Expected</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow
                        key={shipment.id}
                        clickable
                        onClick={() => navigate(`/shipments/${shipment.id}`)}
                      >
                        <TableCell className="font-mono font-medium">
                          <Link to={`/shipments/${shipment.id}`} onClick={(e) => e.stopPropagation()}>
                            {shipment.tracking_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.customer.name}</p>
                            {shipment.customer.city && (
                              <p className="text-xs text-gray-500">{shipment.customer.city}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {shipment.route.origin} → {shipment.route.destination}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="font-mono text-xs">{shipment.carrier.code}</span>
                          <span className="ml-1 text-gray-500">{shipment.carrier.name}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          {shipment.package_weight} kg
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={getPriorityBadgeClass(shipment.priority).replace('badge-', '') as any}>
                            {getPriorityLabel(shipment.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeClass(shipment.status).replace('badge-', '') as any}>
                            {getStatusLabel(shipment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                          {formatDate(shipment.expected_delivery)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="Previous shipment page"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="Next shipment page"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Create Shipment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Shipment"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-md text-danger-600 text-sm">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tracking Number (optional)"
              value={createForm.tracking_number}
              onChange={(e) => setCreateForm({ ...createForm, tracking_number: e.target.value })}
              placeholder="Generated automatically if empty"

            />
            <Select
              label="Customer"
              options={[
                { value: '', label: 'Select Customer' },
                ...customers.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
              value={createForm.customer_id}
              onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}
              required
            />
            <Select
              label="Carrier"
              options={[
                { value: '', label: 'Select Carrier' },
                ...carriers.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
              ]}
              value={createForm.carrier_id}
              onChange={(e) => {
                setCreateForm({ ...createForm, carrier_id: e.target.value, route_id: '' });
              }}
              required
            />
            <Select
              label="Route"
              options={[
                { value: '', label: 'Select Route' },
                ...routes.map((r) => ({ value: String(r.id), label: `${r.origin} → ${r.destination}` })),
              ]}
              value={createForm.route_id}
              onChange={(e) => setCreateForm({ ...createForm, route_id: e.target.value })}
              required
            />
            <Input
              label="Package Weight (kg)"
              type="number"
              step="0.1"
              min="0.1"
              value={createForm.package_weight}
              onChange={(e) => setCreateForm({ ...createForm, package_weight: e.target.value })}
              placeholder="10.0"
              required
            />
            <Select
              label="Priority"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
            />
            <Input
              label="Expected Delivery"
              type="datetime-local"
              value={createForm.expected_delivery}
              onChange={(e) => setCreateForm({ ...createForm, expected_delivery: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Create Shipment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
