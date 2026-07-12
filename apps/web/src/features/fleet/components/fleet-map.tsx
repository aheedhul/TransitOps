import { useEffect, useState, useCallback, type FC } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fleetApi, type FleetPosition } from '../api/client.js';
import { useFleetWebSocket } from '../hooks/use-fleet-websocket.js';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  'available': '#22c55e',
  'on-trip': '#3b82f6',
  'in-shop': '#f97316',
  'retired': '#9ca3af',
};

function createVehicleIcon(status: string): L.DivIcon {
  const color = STATUS_COLORS[status] ?? '#9ca3af';
  return L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 4px rgba(0,0,0,0.3)
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapUpdater({ positions }: { positions: FleetPosition[] }) {
  const map = useMap();
  const [boundsSet, setBoundsSet] = useState(false);

  useEffect(() => {
    if (positions.length > 0 && !boundsSet) {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      setBoundsSet(true);
    }
  }, [positions, map, boundsSet]);

  return null;
}

export const FleetMap: FC = () => {
  const [positions, setPositions] = useState<FleetPosition[]>([]);
  const [selected, setSelected] = useState<FleetPosition | null>(null);

  useEffect(() => {
    fleetApi.getPositions().then((res: { data: FleetPosition[] }) => setPositions(res.data)).catch(() => {});
  }, []);

  const handleMessage = useCallback((msg: { type: string; payload: unknown }) => {
    if (msg.type === 'position_update') {
      const p = msg.payload as FleetPosition;
      setPositions((prev) => {
        const idx = prev.findIndex((x) => x.vehicleId === p.vehicleId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...p };
          return next;
        }
        return [...prev, p];
      });
    }
  }, []);

  useFleetWebSocket(handleMessage);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater positions={positions} />
          {positions.map((p) => (
            <Marker
              key={p.vehicleId}
              position={[p.lat, p.lng]}
              icon={createVehicleIcon(p.vehicleStatus)}
              eventHandlers={{ click: () => setSelected(p) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>{p.vehicleName}</strong>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Status: <span style={{ color: STATUS_COLORS[p.vehicleStatus] }}>{p.vehicleStatus}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Speed: {p.speedKmph} km/h
                    {p.heading != null && <> &middot; Heading: {p.heading}&deg;</>}
                  </div>
                  {p.odometerKm != null && (
                    <div style={{ fontSize: 12 }}>Odometer: {p.odometerKm} km</div>
                  )}
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {new Date(p.recordedAt).toLocaleString()}
                  </div>
                  {p.tripId && (
                    <a
                      href={`/trips/${p.tripId}`}
                      style={{ fontSize: 12, display: 'block', marginTop: 6 }}
                    >
                      View Trip &rarr;
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <aside style={{
        width: 280,
        borderLeft: '1px solid #e5e7eb',
        overflowY: 'auto',
        padding: 16,
        background: '#f9fafb',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Fleet Vehicles</h3>
        {positions.length === 0 && (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>No vehicle positions available</p>
        )}
        {positions.map((p) => (
          <div
            key={p.vehicleId}
            onClick={() => setSelected(p)}
            style={{
              padding: '8px 12px',
              marginBottom: 6,
              borderRadius: 6,
              cursor: 'pointer',
              border: '1px solid #e5e7eb',
              background: selected?.vehicleId === p.vehicleId ? '#eff6ff' : '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: STATUS_COLORS[p.vehicleStatus] ?? '#9ca3af',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{p.vehicleName}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
              {p.speedKmph} km/h &middot; {p.vehicleStatus}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
};
