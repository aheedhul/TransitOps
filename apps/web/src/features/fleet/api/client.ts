import { useAuthStore } from '../../../features/auth/store.js';

const API_BASE = '/api/v1';

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
    throw new Error(err.message ?? 'Request failed');
  }
  return json as T;
}

export interface FleetPosition {
  id: string;
  vehicleId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmph: number;
  odometerKm: number | null;
  source: string;
  tripId: string | null;
  recordedAt: string;
  vehicleName: string;
  vehicleStatus: string;
}

export interface GeofenceResponse {
  id: string;
  name: string;
  kind: string;
  geometryType: string;
  geometry: Record<string, unknown>;
  radiusMeters: number | null;
  centerLat: number | null;
  centerLng: number | null;
  rules: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceInput {
  name: string;
  kind?: string;
  geometryType?: string;
  geometry: Record<string, unknown>;
  radiusMeters?: number;
  centerLat?: number;
  centerLng?: number;
  rules?: Record<string, unknown>;
  active?: boolean;
}

export const fleetApi = {
  getPositions: () => request<{ data: FleetPosition[] }>('GET', '/telematics/fleet-positions'),
  getLatest: (vehicleId: string) => request<{ data: unknown }>('GET', `/telematics/vehicles/${vehicleId}/latest`),
  ingest: (data: unknown) => request<{ data: unknown }>('POST', '/telematics/ingest', data),
};

export const geofenceApi = {
  list: (kind?: string) => request<{ data: GeofenceResponse[] }>('GET', `/geofences${kind ? `?kind=${kind}` : ''}`),
  getById: (id: string) => request<{ data: GeofenceResponse }>('GET', `/geofences/${id}`),
  create: (data: GeofenceInput) => request<{ data: GeofenceResponse }>('POST', '/geofences', data),
  update: (id: string, data: Partial<GeofenceInput>) => request<{ data: GeofenceResponse }>('PUT', `/geofences/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/geofences/${id}`),
};
