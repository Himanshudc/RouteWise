import { clsx,type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    processing: 'badge-gray',
    dispatched: 'badge-info',
    in_transit: 'badge-primary',
    out_for_delivery: 'badge-warning',
    delivered: 'badge-success',
    delayed: 'badge-danger',
    cancelled: 'badge-gray',
  };
  return classes[status] || 'badge-gray';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    processing: 'Processing',
    dispatched: 'Dispatched',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    delayed: 'Delayed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
  };
  return labels[priority] || priority;
}

export function getPriorityBadgeClass(priority: string): string {
  const classes: Record<string, string> = {
    low: 'badge-gray',
    normal: 'badge-info',
    high: 'badge-warning',
  };
  return classes[priority] || 'badge-gray';
}




export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}