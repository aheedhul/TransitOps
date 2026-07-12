import { z } from 'zod';

const MAINTENANCE_TYPES = ['oil_change', 'tyre', 'brake', 'service', 'inspection', 'repair', 'other'] as const;
const STATUSES = ['active', 'closed'] as const;

export const createMaintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.enum(MAINTENANCE_TYPES),
  description: z.string().min(1).max(1000),
  serviceOdometer: z.number().min(0).optional(),
  cost: z.number().min(0).default(0),
  vendor: z.string().max(200).optional(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;

export interface MaintenanceResponse {
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
  predictedScheduleId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
