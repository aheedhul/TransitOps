import { z } from 'zod';

const SOURCES = ['device', 'pwa', 'simulator', 'manual'] as const;

export const telematicsIngestSchema = z.object({
  vehicleId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speedKmph: z.number().min(0).max(300).default(0),
  odometerKm: z.number().min(0).optional(),
  source: z.enum(SOURCES).default('device'),
  tripId: z.string().uuid().optional(),
  recordedAt: z.string().datetime().optional(),
});

export const telematicsBatchSchema = z.object({
  positions: z.array(telematicsIngestSchema).min(1).max(1000),
});

export type TelematicsIngestInput = z.infer<typeof telematicsIngestSchema>;
export type TelematicsBatchInput = z.infer<typeof telematicsBatchSchema>;

export interface VehicleLocationResponse {
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
}

export interface FleetPositionResponse extends VehicleLocationResponse {
  vehicleName: string;
  vehicleStatus: string;
}
