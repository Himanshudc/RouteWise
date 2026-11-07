import {
ChevronLeft,
ChevronRight,
Edit,
Loader2,
Mail,
MapPin,
Phone,
Plus,
Search,
Trash2,
User,
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Button,Input } from '../components/ui';
import { Card,CardBody } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { customersApi } from '../services/api';
import type { Customer,CustomerCreate } from '../types';
import { formatDate } from '../utils/helpers';

export function Customers() {
  const { isAdmin } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout>>();

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerCreate>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Japan',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customersApi.list({ search: search || undefined, page, page_size: pageSize });
      setCustomers(response.data);
      setTotal(Number(response.headers['x-total-count'] ?? response.data.length));
      setError(null);
    } catch (err: any) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
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
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '', city: '', country: 'Japan' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country || 'Japan',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, formData);
      } else {
        await customersApi.create(formData);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      await customersApi.delete(customer.id);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete customer');
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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage customer accounts</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
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
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <User className="w-12 h-12 mb-2 text-gray-300" />
              <p>No customers found</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={openCreateModal}>
                Add your first customer
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{customer.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.email ? (
                            <a href={`mailto:${customer.email}`} className="text-gray-600 hover:text-primary-600 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {customer.email}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <a href={`tel:${customer.phone}`} className="text-gray-600 hover:text-primary-600 flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {customer.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.city && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-3.5 h-3.5" />
                              {customer.city}
                            </span>
                          )}
                          {customer.country && customer.city && <span className="mx-1 text-gray-400">,</span>}
                          {customer.country && <span className="text-gray-500">{customer.country}</span>}
                          {!customer.city && !customer.country && <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                          {formatDate(customer.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" aria-label="Edit customer" onClick={() => openEditModal(customer)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Delete customer" onClick={() => handleDelete(customer)}>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'}>
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
            placeholder="Customer name"
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="customer@example.com"
          />

          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+81-3-1234-5678"
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="1-1-1 Shibuya"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Tokyo"
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Japan"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}