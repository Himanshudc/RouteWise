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
