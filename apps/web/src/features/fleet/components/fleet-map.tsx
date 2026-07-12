import { useEffect, useState, useCallback, type FC } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { MapPin, Compass, Gauge as GaugeIcon, Clock, ExternalLink, Search, Navigation } from 'lucide-react';
import { fleetApi, type FleetPosition } from '../api/client.js';
import { useFleetWebSocket } from '../hooks/use-fleet-websocket.js';
import { Card } from '../../../components/ui/card.js';
import { Input } from '../../../components/ui/input.js';
import { StatusDot, StatusPill, type StatusKind } from '../../../components/ui/status-pill.js';
import { Spinner } from '../../../components/ui/spinner.js';
import { cn } from '../../../lib/utils.js';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  'available': '#10b981',
  'on-trip': '#3b82f6',
  'in-shop': '#f59e0b',
  'retired': '#64748b',
};

function createVehicleIcon(status: string): L.DivIcon {
  const color = STATUS_COLORS[status] ?? '#64748b';
  return L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      position:relative;
    "><div style="
      position:absolute;inset:0;border-radius:50%;
      background:${color};opacity:0.3;
      animation:pulse 2s ease-out infinite;
    "></div></div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.3; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    </style>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
  const { t } = useTranslation();
  const [positions, setPositions] = useState<FleetPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FleetPosition | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fleetApi.getPositions()
      .then((res) => {
        setPositions(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  const filteredPositions = positions.filter((p) =>
    !search || p.vehicleName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4 lg:flex-row">
      {/* Sidebar */}
      <Card className="flex w-full shrink-0 flex-col overflow-hidden lg:w-80">
        <div className="border-b p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Fleet Vehicles</h2>
              <p className="text-xs text-muted-foreground">
                {positions.length} active · live tracking
              </p>
            </div>
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <Input
            type="search"
            placeholder="Filter vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-3.5 w-3.5" />}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner />
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('fleetMap.noPositions')}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPositions.map((p) => (
                <button
                  key={p.vehicleId}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-md border p-2.5 text-left transition-all',
                    selected?.vehicleId === p.vehicleId
                      ? 'border-primary bg-primary/5'
                      : 'bg-background hover:border-primary/30 hover:bg-accent/50',
                  )}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `${STATUS_COLORS[p.vehicleStatus] ?? '#64748b'}20` }}
                  >
                    <Navigation
                      className="h-3.5 w-3.5"
                      style={{ color: STATUS_COLORS[p.vehicleStatus] ?? '#64748b' }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.vehicleName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <GaugeIcon className="h-2.5 w-2.5" />
                      <span className="tabular-nums">{p.speedKmph} km/h</span>
                      <span>·</span>
                      <StatusPill status={p.vehicleStatus as StatusKind} size="sm" withDot={false} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Map */}
      <Card className="relative min-h-[400px] flex-1 overflow-hidden p-0">
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
                <div className="min-w-[220px] space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={p.vehicleStatus} />
                    <p className="text-sm font-semibold">{p.vehicleName}</p>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <GaugeIcon className="h-3 w-3" />
                      <span className="tabular-nums">{p.speedKmph} km/h</span>
                      {p.heading != null && (
                        <>
                          <span>·</span>
                          <Compass className="h-3 w-3" />
                          <span className="tabular-nums">{p.heading}°</span>
                        </>
                      )}
                    </div>
                    {p.odometerKm != null && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        <span className="tabular-nums">{p.odometerKm.toLocaleString()} km</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(p.recordedAt).toLocaleString()}
                    </div>
                  </div>
                  {p.tripId && (
                    <a
                      href={`/trips/${p.tripId}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      {t('fleetMap.viewTrip')}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {selected && (
          <div className="absolute bottom-4 left-4 z-[400] max-w-xs rounded-lg border bg-popover p-3 shadow-floating">
            <p className="text-sm font-semibold text-foreground">{selected.vehicleName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
