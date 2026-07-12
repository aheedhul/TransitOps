export interface TripResponse {
  id: string;
  organizationId: string;
  vehicleId: string | null;
  driverId: string | null;
  customerId: string | null;
  sourceLabel: string;
  sourceLat: number | null;
  sourceLng: number | null;
  destinationLabel: string;
  destinationLat: number | null;
  destinationLng: number | null;
  cargoWeightKg: string;
  plannedDistanceKm: string | null;
  plannedTravelMins: number | null;
  estimatedFuelL: string | null;
  estimatedFuelCost: string | null;
  actualDistanceKm: string | null;
  actualTravelMins: number | null;
  fuelConsumedL: string | null;
  revenueAmount: string | null;
  cargoDescription: string | null;
  status: string;
  dispatchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  sourceLabel: string;
  sourceLat?: number;
  sourceLng?: number;
  destinationLabel: string;
  destinationLat?: number;
  destinationLng?: number;
  cargoWeightKg: number;
  plannedDistanceKm?: number;
  plannedTravelMins?: number;
  estimatedFuelL?: number;
  estimatedFuelCost?: number;
  cargoDescription?: string;
  plannedDepartureAt?: string;
  customerId?: string;
  vehicleId?: string;
  driverId?: string;
  revenueAmount?: number;
}

export type UpdateTripInput = Partial<CreateTripInput>;

export interface DispatchTripInput {
  force?: boolean;
  overrideReason?: 'customer' | 'capacity_tolerance' | 'license_warn';
}

export interface RuleResult {
  rule: string;
  ok: boolean;
  reason?: string;
  message: string;
  field?: string;
  severity?: 'block' | 'warn';
  metadata?: Record<string, unknown>;
}

export interface DispatchCheckResponse {
  chain: RuleResult[];
  canDispatch: boolean;
  blockingReason: string | null;
}

export interface DispatchCheckInput {
  vehicleId: string;
  driverId: string;
  cargoWeightKg: number;
  plannedDepartureAt?: string;
  force?: boolean;
  overrideReason?: 'customer' | 'capacity_tolerance' | 'license_warn';
  sourceLabel?: string;
  destinationLabel?: string;
}

export interface DispatchRecommendationResponse {
  recommendation: {
    vehicleId: string;
    driverId: string;
    confidence: number;
    scores: Record<string, number>;
    reasons: { key: string; ok: boolean; weight: number; message: string }[];
  };
  alternatives: {
    vehicleId: string;
    driverId: string;
    confidence: number;
    scores: Record<string, number>;
    reasons: { key: string; ok: boolean; weight: number; message: string }[];
  }[];
}

export const TRIP_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', hex: '#6b7280' },
  dispatched: { label: 'Dispatched', color: 'bg-blue-100 text-blue-700', hex: '#2563eb' },
  'in-transit': { label: 'In Transit', color: 'bg-indigo-100 text-indigo-700', hex: '#4f46e5' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', hex: '#16a34a' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', hex: '#dc2626' },
} as const;
