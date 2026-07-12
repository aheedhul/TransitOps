import { z } from 'zod';

const GEOFENCE_KINDS = ['depot', 'yard', 'customer', 'restricted', 'charging', 'other'] as const;
const GEOMETRY_TYPES = ['polygon', 'radius', 'bbox'] as const;

export const createGeofenceSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(GEOFENCE_KINDS).default('depot'),
  geometryType: z.enum(GEOMETRY_TYPES).default('polygon'),
  geometry: z.record(z.unknown()),
  radiusMeters: z.number().positive().optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  rules: z
    .object({
      restrictedRoles: z.array(z.string()).optional(),
      allowedVehicleIds: z.array(z.string().uuid()).optional(),
      scheduleActiveHours: z
        .object({ start: z.string(), end: z.string() })
        .optional(),
      maxDwellMinutes: z.number().positive().optional(),
      maxSpeedKmph: z.number().positive().optional(),
      requireAuthorization: z.boolean().optional(),
    })
    .optional()
    .default({}),
  active: z.boolean().default(true),
});

export const updateGeofenceSchema = createGeofenceSchema.partial();

export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;
export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>;

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
