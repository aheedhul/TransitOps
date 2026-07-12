import { z } from 'zod';

const DRIVER_STATUSES = ['available', 'on-trip', 'off-duty', 'suspended'] as const;

export const createDriverSchema = z.object({
  name: z.string().min(1).max(200),
  licenseNumber: z.string().min(1).max(100),
  licenseCategory: z.string().min(1).max(20),
  licenseExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactNumber: z.string().min(1).max(20),
});

export const updateDriverSchema = createDriverSchema.partial().extend({
  status: z.enum(DRIVER_STATUSES).optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

export interface DriverResponse {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string | null;
  safetyScore: string;
  overallScore: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
