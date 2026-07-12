import { useState } from 'react';
import { useDispatchRecommendation } from '../api/hooks.js';
import type { TripResponse } from '../api/types.js';

interface Props {
  trip: TripResponse;
}

export function DispatchRecommendationCard({ trip }: Props) {
  const rec = useDispatchRecommendation();
  const [expanded, setExpanded] = useState(false);

  const cargoWeight = parseFloat(trip.cargoWeightKg);

  const handleCheck = () => {
    rec.mutate(
      {
        cargoWeightKg: cargoWeight,
        sourceLat: trip.sourceLat ?? undefined,
        sourceLng: trip.sourceLng ?? undefined,
        plannedDepartureAt: trip.plannedDepartureAt ?? undefined,
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Dispatch Recommendation</h3>
        <button
          onClick={handleCheck}
          disabled={rec.isPending}
          className="rounded border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          {rec.isPending ? 'Analyzing...' : 'Get Recommendation'}
        </button>
      </div>

      {rec.data?.data?.recommendation && (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-blue-700">Top Pick</span>
                <p className="mt-1 text-sm">
                  Vehicle <code className="text-xs">{rec.data.data.recommendation.vehicleId.slice(0, 8)}...</code>
                  {' + '}
                  Driver <code className="text-xs">{rec.data.data.recommendation.driverId.slice(0, 8)}...</code>
                </p>
              </div>
              <span className="text-lg font-bold text-blue-700">
                {rec.data.data.recommendation.confidence}%
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {rec.data.data.recommendation.reasons.map((r: { key: string; ok: boolean; message: string }, i: number) => (
                <span
                  key={i}
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                    r.ok ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={r.message}
                >
                  {r.key}
                </span>
              ))}
            </div>
          </div>

          {expanded && rec.data.data.alternatives.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Alternatives</h4>
              {rec.data.data.alternatives.slice(0, 3).map((alt: { vehicleId: string; driverId: string; confidence: number; reasons: { key: string }[] }, i: number) => (
                <div key={i} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      <code className="text-xs">{alt.vehicleId.slice(0, 8)}...</code> +{' '}
                      <code className="text-xs">{alt.driverId.slice(0, 8)}...</code>
                    </span>
                    <span className="font-bold text-muted-foreground">{alt.confidence}%</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {alt.reasons.map((r: { key: string }, j: number) => (
                      <span
                        key={j}
                        className="inline-flex rounded-full px-1.5 py-0.5 text-xs bg-muted text-muted-foreground"
                      >
                        {r.key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {rec.data.data.alternatives.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:underline"
            >
              {expanded ? 'Hide alternatives' : `Show ${rec.data.data.alternatives.length} alternatives`}
            </button>
          )}
        </div>
      )}

      {rec.error && (
        <p className="text-xs text-red-500">{(rec.error as Error).message}</p>
      )}
    </div>
  );
}
