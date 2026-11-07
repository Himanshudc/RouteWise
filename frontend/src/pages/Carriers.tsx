import {
AlertTriangle,
BarChart2,
ChevronLeft,
ChevronRight,
Edit,
Loader2,
Plus,
Search,
Trash2,
Truck,
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Button,Input } from '../components/ui';
import { Badge } from '../components/ui/Badge';
import { Card,CardBody } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { carriersApi } from '../services/api';
import type { Carrier,CarrierCreate,CarrierPerformance } from '../types';
import { formatDate } from '../utils/helpers';

export function Carriers() {
  const { isAdmin } = useAuth();

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout>>();

  const [showModal, setShowModal] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [formData, setFormData] = useState<CarrierCreate>({
    name: '',
    code: '',
    historical_delay_rate: 0,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPerformance, setSelectedPerformance] = useState<CarrierPerformance | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  const fetchCarriers = async () => {
    try {
      setIsLoading(true);
      const response = await carriersApi.list({ search: search || undefined, page, page_size: pageSize });
      setCarriers(response.data);
      setTotal(Number(response.headers['x-total-count'] ?? response.data.length));
      setError(null);
    } catch (err: any) {
      setError('Failed to load carriers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCarriers();
  }, [page, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setPage(1);
    }, 300);
    setSearchTimeout(timeout);
  };

  const openCreateModal = () => {
    setEditingCarrier(null);
    setFormData({ name: '', code: '', historical_delay_rate: 0 });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (carrier: Carrier) => {
    setEditingCarrier(carrier);
    setFormData({
      name: carrier.name,
      code: carrier.code,
      historical_delay_rate: carrier.historical_delay_rate,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingCarrier) {
        await carriersApi.update(editingCarrier.id, formData);
      } else {
        await carriersApi.create(formData);
      }
      setShowModal(false);
      fetchCarriers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save carrier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (carrier: Carrier) => {
    if (!window.confirm(`Delete carrier "${carrier.name}"?`)) return;
    try {
      await carriersApi.delete(carrier.id);
      fetchCarriers();
    } catch (err) {
      alert('Failed to delete carrier');
    }
  };

  const handleViewPerformance = async (carrier: Carrier) => {
    try {
      const response = await carriersApi.getPerformance(carrier.id);
      setSelectedPerformance(response.data);
      setShowPerformanceModal(true);
    } catch (err) {
      alert('Failed to load performance data');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carriers</h1>
          <p className="text-gray-500 mt-1">Manage shipping carriers</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Add Carrier
        </Button>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search carriers..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input pl-10"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin w-8 h-8 text-primary-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-danger-500">{error}</div>
          ) : carriers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Truck className="w-12 h-12 mb-2 text-gray-300" />
              <p>No carriers found</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={openCreateModal}>
                Add your first carrier
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Delay Rate</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carriers.map((carrier) => (
                      <TableRow key={carrier.id}>
                        <TableCell>
                          <Badge variant="primary" className="font-mono text-sm">
                            {carrier.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center">
                              <Truck className="w-4 h-4 text-accent-600" />
                            </div>
                            <p className="font-medium text-gray-900">{carrier.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                carrier.historical_delay_rate > 0.25 ? 'danger' :
                                carrier.historical_delay_rate > 0.15 ? 'warning' : 'success'
                              }
                            >
                              {(carrier.historical_delay_rate * 100).toFixed(1)}%
                            </Badge>
                            {carrier.historical_delay_rate > 0.25 && (
                              <AlertTriangle className="w-3.5 h-3.5 text-danger-500" aria-label="High delay rate" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                          {formatDate(carrier.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" aria-label="Edit carrier" onClick={() => openEditModal(carrier)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="View carrier performance" onClick={() => handleViewPerformance(carrier)}>
                              <BarChart2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Delete carrier" onClick={() => handleDelete(carrier)}>
                              <Trash2 className="w-4 h-4 text-danger-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCarrier ? 'Edit Carrier' : 'Add Carrier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-md text-danger-600 text-sm">
              {formError}
            </div>
          )}

          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Sakura Express"
            required
          />

          <Input
            label="Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="SAK"
            maxLength={20}
            required
          />

          <Input
            label="Historical Delay Rate"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={formData.historical_delay_rate}
            onChange={(e) => setFormData({ ...formData, historical_delay_rate: parseFloat(e.target.value) || 0 })}
            placeholder="0.15"
            helperText="Enter as decimal (e.g., 0.15 for 15%)"
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingCarrier ? 'Save Changes' : 'Create Carrier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Performance Modal */}
      <Modal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        title="Carrier Performance"
        size="md"
      >
        {selectedPerformance ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{selectedPerformance.total_shipments}</p>
                <p className="text-xs text-gray-500">Total Shipments</p>
              </div>
              <div className="p-4 bg-danger-50 rounded-lg">
                <p className="text-2xl font-bold text-danger-600">{selectedPerformance.delayed_shipments}</p>
                <p className="text-xs text-gray-500">Delayed</p>
              </div>
              <div className="p-4 bg-success-50 rounded-lg">
                <p className="text-2xl font-bold text-success-600">
                  {(selectedPerformance.on_time_rate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">On-Time Rate</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Details</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Carrier</dt>
                  <dd className="font-medium">{selectedPerformance.name} ({selectedPerformance.code})</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Historical Delay Rate</dt>
                  <dd className="font-medium">{(selectedPerformance.historical_delay_rate * 100).toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Actual Delay Rate</dt>
                  <dd className="font-medium text-danger-600">
                    {selectedPerformance.total_shipments > 0
                      ? ((selectedPerformance.delayed_shipments / selectedPerformance.total_shipments) * 100).toFixed(1) + '%'
                      : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowPerformanceModal(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin w-8 h-8 text-primary-500" />
          </div>
        )}
      </Modal>
    </div>
  );
}