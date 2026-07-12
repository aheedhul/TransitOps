import { z } from 'zod';

export const createFuelLogSchema = z.object({
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  liters: z.number().positive(),
  cost: z.number().min(0),
  odometerKm: z.number().min(0),
  fuelType: z.string().min(1).max(20),
  filledStation: z.string().max(200).optional(),
  filledAt: z.string().datetime(),
});

export const updateFuelLogSchema = createFuelLogSchema.partial();

export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
export type UpdateFuelLogInput = z.infer<typeof updateFuelLogSchema>;

export interface FuelLogResponse {
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
