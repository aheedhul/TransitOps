export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteOpts {
  alternatives?: boolean;
  avoidTolls?: boolean;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  polyline?: string;
  steps?: { instruction: string; distanceKm: number; durationMin: number }[];
}

export interface MatrixResult {
  distancesKm: number[][];
  durationsMin: number[][];
}

export interface GeoCandidate {
  label: string;
  lat: number;
  lng: number;
  confidence: number;
}

export interface MapsProvider {
  id: 'ors' | 'google' | 'mapbox' | 'osrm' | 'mock';
  route(orig: GeoPoint, dest: GeoPoint, opts?: RouteOpts): Promise<RouteResult>;
  matrix(origins: GeoPoint[], dests: GeoPoint[]): Promise<MatrixResult>;
  geocode(q: string): Promise<GeoCandidate[]>;
  matchNearestRoad(point: GeoPoint): Promise<GeoPoint & { road?: string }>;
}

function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

class MockMapsProvider implements MapsProvider {
  id = 'mock' as const;

  async route(orig: GeoPoint, dest: GeoPoint): Promise<RouteResult> {
    const distanceKm = haversineDistance(orig, dest);
    const avgSpeedKph = 50 + Math.random() * 20;
    const durationMin = (distanceKm / avgSpeedKph) * 60;

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin),
    };
  }

  async matrix(): Promise<MatrixResult> {
    return { distancesKm: [], durationsMin: [] };
  }

  async geocode(): Promise<GeoCandidate[]> {
    return [];
  }

  async matchNearestRoad(point: GeoPoint): Promise<GeoPoint & { road?: string }> {
    return { ...point, road: 'unknown' };
  }
}

let cachedProvider: MapsProvider | null = null;

export function getMapsAdapter(): MapsProvider {
  if (!cachedProvider) {
    cachedProvider = new MockMapsProvider();
  }
  return cachedProvider;
}
