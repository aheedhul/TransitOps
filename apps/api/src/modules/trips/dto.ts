import { z } from 'zod';

const CANCEL_REASONS = ['customer', 'vehicle_breakdown', 'weather', 'compliance', 'duplicate', 'other'] as const;
const OVERRIDE_REASONS = ['customer', 'capacity_tolerance', 'license_warn'] as const;

export const createTripSchema = z.object({
  sourceLabel: z.string().min(1).max(200),
  sourceLat: z.number().min(-90).max(90).optional(),
  sourceLng: z.number().min(-180).max(180).optional(),
  destinationLabel: z.string().min(1).max(200),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  cargoWeightKg: z.number().positive().max(100000),
  plannedDistanceKm: z.number().positive().max(20000).optional(),
  plannedTravelMins: z.number().int().positive().max(10080).optional(),
  estimatedFuelL: z.number().positive().max(10000).optional(),
  estimatedFuelCost: z.number().min(0).max(10000000).optional(),
  cargoDescription: z.string().max(1000).optional(),
  plannedDepartureAt: z.string().datetime().optional(),
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  revenueAmount: z.number().min(0).max(10000000).optional(),
});

export const updateTripSchema = z.object({
  sourceLabel: z.string().min(1).max(200).optional(),
  sourceLat: z.number().min(-90).max(90).optional(),
  sourceLng: z.number().min(-180).max(180).optional(),
  destinationLabel: z.string().min(1).max(200).optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  cargoWeightKg: z.number().positive().max(100000).optional(),
  plannedDistanceKm: z.number().positive().max(20000).optional(),
  plannedTravelMins: z.number().int().positive().max(10080).optional(),
  estimatedFuelL: z.number().positive().max(10000).optional(),
  estimatedFuelCost: z.number().min(0).max(10000000).optional(),
  cargoDescription: z.string().max(1000).optional(),
  plannedDepartureAt: z.string().datetime().optional(),
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  revenueAmount: z.number().min(0).max(10000000).optional(),
});

export const dispatchTripSchema = z.object({
  force: z.boolean().default(false),
  overrideReason: z.enum(OVERRIDE_REASONS).optional(),
});

export const startTripSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  odometerKm: z.number().min(0).optional(),
});

export const checkpointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  odometerKm: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});

export const completeTripSchema = z.object({
  actualDistanceKm: z.number().positive().max(20000),
  fuelConsumedL: z.number().positive().max(10000),
  actualTravelMins: z.number().int().positive().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  odometerKm: z.number().min(0).optional(),
});

export const cancelTripSchema = z.object({
  cancelReason: z.enum(CANCEL_REASONS),
});

export const routeAutofillSchema = z.object({
  sourceLat: z.number().min(-90).max(90).optional(),
  sourceLng: z.number().min(-180).max(180).optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
});

export const dispatchCheckSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  cargoWeightKg: z.number().positive().max(100000),
  plannedDepartureAt: z.string().datetime().optional(),
  force: z.boolean().default(false),
  overrideReason: z.enum(OVERRIDE_REASONS).optional(),
});

export const dispatchRecommendationSchema = z.object({
  cargoWeightKg: z.number().positive().max(100000),
  sourceLat: z.number().min(-90).max(90).optional(),
  sourceLng: z.number().min(-180).max(180).optional(),
  plannedDepartureAt: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type DispatchTripInput = z.infer<typeof dispatchTripSchema>;
export type StartTripInput = z.infer<typeof startTripSchema>;
export type CheckpointInput = z.infer<typeof checkpointSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
export type CancelTripInput = z.infer<typeof cancelTripSchema>;
export type RouteAutofillInput = z.infer<typeof routeAutofillSchema>;
export type DispatchCheckInput = z.infer<typeof dispatchCheckSchema>;
export type DispatchRecommendationInput = z.infer<typeof dispatchRecommendationSchema>;

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

export interface SortedScore {
  capacityHeadroom: number;
  distanceToPickup: number;
  fuelEfficiency: number;
  maintenanceHeadroom: number;
  driverSafety: number;
  driverFuelRating: number;
}

export interface RankedPair {
  vehicleId: string;
  driverId: string;
  confidence: number;
  scores: SortedScore;
  reasons: { key: string; ok: boolean; weight: number; message: string }[];
}

export interface DispatchRecommendationResponse {
  recommendation: RankedPair;
  alternatives: RankedPair[];
}
