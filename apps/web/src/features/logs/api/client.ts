import { useAuthStore } from '../../auth/store.js';

const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { session } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) {
    const err = json.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? 'Request failed', err.details);
  }
  return json as T;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  serviceOdometer: string | null;
  cost: string;
  vendor: string | null;
  status: string;
  closedAt: string | null;
  closedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId: string | null;
  liters: string;
  cost: string;
  odometerKm: string;
  fuelType: string;
  filledStation: string | null;
  filledAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListItem {
  id: string;
  registrationNumber: string;
  name: string | null;
  status: string;
  maxLoadCapacity: string;
  odometer: string;
  fuelType: string;
}

export const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil change' },
  { value: 'tyre', label: 'Tyre' },
  { value: 'brake', label: 'Brake' },
  { value: 'service', label: 'Service' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'other', label: 'Other' },
] as const;

export const FUEL_TYPES = ['diesel', 'petrol', 'cng', 'electric', 'hybrid'] as const;

export { ApiError };
export const logsApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
