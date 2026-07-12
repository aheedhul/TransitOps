import { useEffect, useState, type FC } from 'react';
import { fleetApi, type FleetPosition } from '../api/client.js';

const STATUS_COLORS: Record<string, string> = {
  'available': '#22c55e',
  'on-trip': '#3b82f6',
  'in-shop': '#f97316',
  'retired': '#9ca3af',
};

export const DigitalTwinGrid: FC = () => {
  const [positions, setPositions] = useState<FleetPosition[]>([]);

  useEffect(() => {
    fleetApi.getPositions().then((res) => setPositions(res.data)).catch(() => {});
    const interval = setInterval(() => {
      fleetApi.getPositions().then((res) => setPositions(res.data)).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">Digital Twin</h3>
        <p className="text-xs text-muted-foreground">No vehicle position data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Digital Twin ({positions.length} vehicles)</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
        gap: 6,
      }}>
        {positions.map((p) => (
          <a
            key={p.vehicleId}
            href={`/vehicles`}
            title={`${p.vehicleName} — ${p.vehicleStatus}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px',
              borderRadius: 8,
              background: STATUS_COLORS[p.vehicleStatus] ?? '#9ca3af',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              textDecoration: 'none',
              textAlign: 'center',
              lineHeight: 1.2,
              minHeight: 60,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 8, opacity: 0.8 }}>{p.vehicleStatus}</span>
            <span style={{ marginTop: 2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.vehicleName}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
