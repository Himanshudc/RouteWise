import {
ChevronLeft,
ChevronRight,
Edit,
Loader2,
MapPin,
Navigation,
Plus,
Search,
Trash2,
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Button,Input } from '../components/ui';
import { Card,CardBody } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { routesApi } from '../services/api';
import type { Route,RouteCreate } from '../types';
import { formatDate } from '../utils/helpers';

export function Routes() {
  const { isAdmin } = useAuth();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout>>();

  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState<RouteCreate>({
    origin: '',
    destination: '',
    distance_km: 0,
    estimated_hours: 0,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      const response = await routesApi.list({ search: search || undefined, page, page_size: pageSize });
      setRoutes(response.data);
      setTotal(Number(response.headers['x-total-count'] ?? response.data.length));
      setError(null);
    } catch (err: any) {
      setError('Failed to load routes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
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
    setEditingRoute(null);
    setFormData({ origin: '', destination: '', distance_km: 0, estimated_hours: 0 });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km,
      estimated_hours: route.estimated_hours,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingRoute) {
        await routesApi.update(editingRoute.id, formData);
      } else {
        await routesApi.create(formData);
      }
      setShowModal(false);
      fetchRoutes();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save route');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (route: Route) => {
    if (!window.confirm(`Delete route "${route.origin} → ${route.destination}"?`)) return;
    try {
      await routesApi.delete(route.id);
      fetchRoutes();
    } catch (err) {
      alert('Failed to delete route');
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
          <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
          <p className="text-gray-500 mt-1">Manage shipping routes</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Add Route
        </Button>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search routes..."
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
          ) : routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Navigation className="w-12 h-12 mb-2 text-gray-300" />
              <p>No routes found</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={openCreateModal}>
                Add your first route
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origin</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead className="hidden md:table-cell">Distance</TableHead>
                      <TableHead className="hidden md:table-cell">Est. Time</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="font-medium text-gray-900">{route.origin}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-red-600" />
                            </div>
                            <p className="font-medium text-gray-900">{route.destination}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-mono text-gray-900">{route.distance_km.toLocaleString()} km</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-mono text-gray-900">{route.estimated_hours}h</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                          {formatDate(route.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" aria-label="Edit route" onClick={() => openEditModal(route)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Delete route" onClick={() => handleDelete(route)}>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingRoute ? 'Edit Route' : 'Add Route'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-md text-danger-600 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Origin"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              placeholder="Osaka"
              required
            />
            <Input
              label="Destination"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="Tokyo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Distance (km)"
              type="number"
              min="1"
              step="1"
              value={formData.distance_km}
              onChange={(e) => setFormData({ ...formData, distance_km: parseInt(e.target.value) || 0 })}
              placeholder="500"
              required
            />
            <Input
              label="Estimated Hours"
              type="number"
              min="1"
              step="1"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 0 })}
              placeholder="8"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingRoute ? 'Save Changes' : 'Create Route'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}