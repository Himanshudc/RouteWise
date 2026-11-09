import axios,{ AxiosError,InternalAxiosRequestConfig } from 'axios';
import type {
Carrier,
CarrierCreate,
CarrierPerformance,
CarrierPerformanceChart,
CarrierUpdate,
Customer,
CustomerCreate,
CustomerUpdate,
DashboardSummary,
LoginRequest,
PaginatedResponse,
PerformanceChart,
PredictionResponse,
RegisterRequest,
RiskDistributionChart,
RiskSummary,
Route,
RouteCreate,
RouteUpdate,
ShipmentCreate,
ShipmentDetail,
ShipmentFilters,
ShipmentListItem,
ShipmentStatusUpdate,
ShipmentUpdate,
StatusDistributionChart,
Token,
User,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data: LoginRequest) => api.post<Token>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<User>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
};

// Customers
export const customersApi = {
  list: (params?: { search?: string; page?: number; page_size?: number }) =>
    api.get<Customer[]>('/customers', { params }),
  get: (id: number) => api.get<Customer>(`/customers/${id}`),
  create: (data: CustomerCreate) => api.post<Customer>('/customers', data),
  update: (id: number, data: CustomerUpdate) => api.put<Customer>(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// Carriers
export const carriersApi = {
  list: (params?: { search?: string; page?: number; page_size?: number }) =>
    api.get<Carrier[]>('/carriers', { params }),
  get: (id: number) => api.get<Carrier>(`/carriers/${id}`),
  getPerformance: (id: number) => api.get<CarrierPerformance>(`/carriers/${id}/performance`),
  create: (data: CarrierCreate) => api.post<Carrier>('/carriers', data),
  update: (id: number, data: CarrierUpdate) => api.put<Carrier>(`/carriers/${id}`, data),
  delete: (id: number) => api.delete(`/carriers/${id}`),
};

// Routes
export const routesApi = {
  list: (params?: { search?: string; page?: number; page_size?: number }) =>
    api.get<Route[]>('/routes', { params }),
  get: (id: number) => api.get<Route>(`/routes/${id}`),
  create: (data: RouteCreate) => api.post<Route>('/routes', data),
  update: (id: number, data: RouteUpdate) => api.put<Route>(`/routes/${id}`, data),
  delete: (id: number) => api.delete(`/routes/${id}`),
};

// Shipments
export const shipmentsApi = {
  list: (filters: ShipmentFilters = {}) =>
    api.get<PaginatedResponse<ShipmentListItem>>('/shipments', { params: filters }),
  get: (id: number) => api.get<ShipmentDetail>(`/shipments/${id}`),
  track: (trackingNumber: string) => api.get<ShipmentDetail>(`/shipments/tracking/${trackingNumber}`),
  create: (data: ShipmentCreate) => api.post<ShipmentDetail>('/shipments', data),
  update: (id: number, data: ShipmentUpdate) => api.put<ShipmentDetail>(`/shipments/${id}`, data),
  updateStatus: (id: number, data: ShipmentStatusUpdate) =>
    api.put<ShipmentDetail>(`/shipments/${id}/status`, data),
  addEvent: (id: number, data: ShipmentStatusUpdate) =>
    api.post(`/shipments/${id}/events`, data),
  getPrediction: (id: number) => api.get<PredictionResponse>(`/shipments/${id}/prediction`),
};

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getRiskSummary: () => api.get<RiskSummary>('/dashboard/risk-summary'),
  getStatusChart: () => api.get<StatusDistributionChart>('/dashboard/charts/status'),
  getPerformanceChart: (weeks = 8) =>
    api.get<PerformanceChart>('/dashboard/charts/performance', { params: { weeks } }),
  getCarrierChart: () => api.get<CarrierPerformanceChart>('/dashboard/charts/carriers'),
  getRiskChart: () => api.get<RiskDistributionChart>('/dashboard/charts/risk'),
};

export default api;
