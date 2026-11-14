// API Types matching backend schemas

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'customer';
}

// Customer
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  created_at: string;
}

export interface CustomerCreate {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

// Carrier
export interface Carrier {
  id: number;
  name: string;
  code: string;
  historical_delay_rate: number;
  created_at: string;
}

export interface CarrierCreate {
  name: string;
  code: string;
  historical_delay_rate: number;
}

export interface CarrierUpdate {
  name?: string;
  code?: string;
  historical_delay_rate?: number;
}

export interface CarrierPerformance extends Carrier {
  total_shipments: number;
  delayed_shipments: number;
  on_time_rate: number;
}

// Route
export interface Route {
  id: number;
  origin: string;
  destination: string;
  distance_km: number;
  estimated_hours: number;
  created_at: string;
}

export interface RouteCreate {
  origin: string;
  destination: string;
  distance_km: number;
  estimated_hours: number;
}

export interface RouteUpdate {
  origin?: string;
  destination?: string;
  distance_km?: number;
  estimated_hours?: number;
}

// Shipment
export type ShipmentStatus =
  | 'processing'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'cancelled';

export type ShipmentPriority = 'low' | 'normal' | 'high';

export interface ShipmentEvent {
  id: number;
  status: ShipmentStatus;
  location?: string;
  timestamp: string;
  description?: string;
}

export interface CustomerSummary {
  id: number;
  name: string;
  city?: string;
}

export interface CarrierSummary {
  id: number;
  name: string;
  code: string;
  historical_delay_rate: number;
}

export interface RouteSummary {
  id: number;
  origin: string;
  destination: string;
  distance_km: number;
  estimated_hours: number;
}

export interface ShipmentListItem {
  id: number;
  tracking_number: string;
  customer: CustomerSummary;
  carrier: CarrierSummary;
  route: RouteSummary;
  package_weight: number;
  priority: ShipmentPriority;
  status: ShipmentStatus;
  created_at: string;
  expected_delivery: string;
  actual_delivery?: string;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_probability?: number;
  risk_method?: 'rules';
  risk_reasons?: string[];
}

export interface ShipmentDetail extends ShipmentListItem {
  events: ShipmentEvent[];
}

export interface ShipmentCreate {
  tracking_number: string;
  customer_id: number;
  carrier_id: number;
  route_id: number;
  package_weight: number;
  priority: ShipmentPriority;
  expected_delivery: string;
}

export interface ShipmentUpdate {
  status?: ShipmentStatus;
  expected_delivery?: string;
  actual_delivery?: string;
  priority?: ShipmentPriority;
}

export interface ShipmentStatusUpdate {
  status: ShipmentStatus;
  location?: string;
  description?: string;
}

export interface ShipmentFilters {
  search?: string;
  status?: ShipmentStatus;
  carrier_id?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Prediction
export interface PredictionResponse {
  method: 'rules';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  probability: number;
  reasons: string[];
}

// Alert
export interface Alert {
  id: number;
  shipment_id: number;
  type: 'high_risk' | 'overdue' | 'delayed';
  message: string;
  is_acknowledged: boolean;
  created_at: string;
  acknowledged_at?: string;
  shipment_tracking_number?: string;
}

// Dashboard
export interface DashboardSummary {
  total_shipments: number;
  in_transit: number;
  delivered_today: number;
  delayed: number;
}

export interface RiskSummary {
  high: number;
  medium: number;
  low: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface StatusDistributionChart {
  data: ChartDataPoint[];
}

export interface PerformanceChart {
  labels: string[];
  on_time_rates: number[];
}

export interface CarrierPerformanceChart {
  data: ChartDataPoint[];
}

export interface RiskDistributionChart {
  data: ChartDataPoint[];
}
