import { z } from 'zod';

const VEHICLE_TYPES = ['truck', 'van', 'car', 'tractor', 'trailer', 'tanker', 'bus', 'ev', 'other'] as const;
const FUEL_TYPES = ['diesel', 'petrol', 'cng', 'electric', 'hybrid'] as const;
const STATUSES = ['available', 'on-trip', 'in-shop', 'retired'] as const;

export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(50),
  name: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  type: z.enum(VEHICLE_TYPES),
  maxLoadCapacity: z.number().positive(),
  fuelType: z.enum(FUEL_TYPES).default('diesel'),
  acquisitionCost: z.number().min(0),
  acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currencyCode: z.string().length(3).default('INR'),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export interface VehicleResponse {
  id: string;
  registrationNumber: string;
  name: string | null;
  model: string | null;
  type: string;
  maxLoadCapacity: string;
  odometer: string;
  fuelType: string;
  acquisitionCost: string | null;
  acquisitionDate: string;
  currencyCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
