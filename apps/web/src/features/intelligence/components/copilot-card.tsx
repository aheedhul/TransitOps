import { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/store.js';
import clsx from 'clsx';

interface CopilotSignal {
  key: string;
  label: string;
  value: number | string;
  unit: string;
  context: string;
  score: 'good' | 'warn' | 'critical';
}

interface CopilotRecommendation {
  action: string;
  timing: string;
  why: string;
  confidence: number;
}

interface CopilotData {
  headline: string;
  signals: CopilotSignal[];
  recommendation: CopilotRecommendation;
  sources: {
    vehicleHealthScoreId?: string;
    maintenanceScheduleIds: string[];
    anomalyIds: string[];
  };
  prose: string;
}

const API_BASE = '/api/v1';

async function fetchCopilot(vehicleId: string, useLLM = false): Promise<CopilotData | null> {
  const { session } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  const llmParam = useLLM ? '?llm=true' : '';
  const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/copilot${llmParam}`, { headers });
  if (res.status === 404) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load copilot');
  return json.data;
}

function scoreColor(score: string) {
  switch (score) {
    case 'good': return 'text-green-600 bg-green-50';
    case 'warn': return 'text-yellow-600 bg-yellow-50';
    case 'critical': return 'text-red-600 bg-red-50';
    default: return 'text-muted-foreground bg-muted';
  }
}

function scoreIcon(score: string) {
  switch (score) {
    case 'good': return '✓';
    case 'warn': return '⚡';
    case 'critical': return '✕';
    default: return '—';
  }
}

export function CopilotCard({ vehicleId }: { vehicleId: string }) {
  const [data, setData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const loadCopilot = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCopilot(vehicleId, true); // always try LLM; falls back server-side
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCopilot();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 animate-pulse">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="mt-3 h-4 w-full rounded bg-muted" />
        <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="text-sm text-red-500">Unable to load copilot insights: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="text-sm text-muted-foreground">No copilot data available for this vehicle. Complete a trip or record maintenance to generate insights.</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{data.headline}</h3>
        <span className="text-xs text-muted-foreground">AI Copilot</span>
      </div>

      <div className="mb-4 text-sm leading-relaxed text-foreground">
        {data.prose}
      </div>

      <div className="mb-4 space-y-2">
        {data.signals.map((signal) => (
          <div key={signal.key} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <div className="text-sm font-medium">{signal.label}</div>
              <div className="text-xs text-muted-foreground">{signal.context}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {signal.value}{signal.unit && ` ${signal.unit}`}
              </span>
              <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', scoreColor(signal.score))}>
                {scoreIcon(signal.score)} {signal.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              {data.recommendation.action.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Timing: {data.recommendation.timing.replace(/_/g, ' ')} &middot; Confidence: {data.recommendation.confidence}%
            </div>
          </div>
          <button
            onClick={() => setShowWhy(!showWhy)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showWhy ? 'Hide trace' : 'Show why'}
          </button>
        </div>

        {showWhy && (
          <div className="mt-3 rounded-md bg-background p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Why this recommendation?</div>
            <div>{data.recommendation.why}</div>
            <div className="mt-2 pt-2 border-t">
              <span className="font-medium">Signals trace: </span>
              {Object.entries(data.sources).filter(([_, v]) => (Array.isArray(v) ? v.length > 0 : !!v)).length > 0
                ? [
                    data.sources.vehicleHealthScoreId && `Health score #${data.sources.vehicleHealthScoreId.slice(0, 8)}`,
                    data.sources.maintenanceScheduleIds.length > 0 && `${data.sources.maintenanceScheduleIds.length} maintenance schedule(s)`,
                    data.sources.anomalyIds.length > 0 && `${data.sources.anomalyIds.length} fuel anomaly(s)`,
                  ].filter(Boolean).join(' · ')
                : 'No source data linked'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
