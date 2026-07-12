import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../auth/store.js';
import { Card } from '../../../components/ui/card.js';
import { Spinner } from '../../../components/ui/spinner.js';
import { Button } from '../../../components/ui/button.js';
import { cn } from '../../../lib/utils.js';

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
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json.data;
}

const SCORE_CONFIG: Record<string, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  good: {
    Icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    label: 'Good',
  },
  warn: {
    Icon: AlertTriangle,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    label: 'Warning',
  },
  critical: {
    Icon: AlertTriangle,
    className: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
    label: 'Critical',
  },
};

export function CopilotCard({ vehicleId }: { vehicleId: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const loadCopilot = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCopilot(vehicleId, true);
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
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Spinner />
          <div className="space-y-1.5">
            <div className="h-4 w-40 rounded bg-muted skeleton" />
            <div className="h-3 w-56 rounded bg-muted skeleton" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">{t('copilot.error', { error })}</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('copilot.noData')}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-gradient-to-br from-primary/5 via-primary/5 to-transparent px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{data.headline}</h3>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('copilot.title')}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
          AI
        </span>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm leading-relaxed text-foreground/90">{data.prose}</p>

        <div className="space-y-2">
          {data.signals.map((signal) => {
            const config = SCORE_CONFIG[signal.score] ?? SCORE_CONFIG.good!;
            const Icon = config.Icon;
            return (
              <div
                key={signal.key}
                className="flex items-center justify-between rounded-md border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{signal.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{signal.context}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {signal.value}
                    {signal.unit && ` ${signal.unit}`}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                      config.className,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground capitalize">
                  {data.recommendation.action.replace(/_/g, ' ')}
                </p>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Timing:</span>
                <span className="font-medium capitalize text-foreground">
                  {data.recommendation.timing.replace(/_/g, ' ')}
                </span>
                <span>·</span>
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium text-foreground">
                  {data.recommendation.confidence}% confidence
                </span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowWhy(!showWhy)}
            >
              {showWhy ? t('copilot.hideTrace') : t('copilot.showWhy')}
            </Button>
          </div>

          {showWhy && (
            <div className="mt-3 space-y-2 rounded-md border bg-background p-3 text-xs text-muted-foreground animate-fade-in">
              <div>
                <p className="font-semibold text-foreground">{t('copilot.whyRecommendation')}</p>
                <p className="mt-1">{data.recommendation.why}</p>
              </div>
              <div className="border-t pt-2">
                <p className="font-semibold text-foreground">{t('copilot.signalsTrace')}</p>
                <p className="mt-1">
                  {data.sources.vehicleHealthScoreId && (
                    <>Health score #{data.sources.vehicleHealthScoreId.slice(0, 8)} · </>
                  )}
                  {data.sources.maintenanceScheduleIds.length > 0 &&
                    `${data.sources.maintenanceScheduleIds.length} maintenance schedule(s) · `}
                  {data.sources.anomalyIds.length > 0 &&
                    `${data.sources.anomalyIds.length} fuel anomaly(s)`}
                  {!data.sources.vehicleHealthScoreId &&
                    data.sources.maintenanceScheduleIds.length === 0 &&
                    data.sources.anomalyIds.length === 0 &&
                    t('copilot.noSourceData')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
