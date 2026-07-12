import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ChevronDown, ChevronUp, Award, Lightbulb } from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../../../components/ui/button.js';
import { Spinner } from '../../../components/ui/spinner.js';

interface VehicleCandidate {
  vehicleId: string;
  vehicleRegistration: string;
  driverId: string;
  driverName: string;
  score: number;
  reasonSummary: string;
}

interface RecommendationResponse {
  topPick?: VehicleCandidate;
  alternatives: VehicleCandidate[];
}

export function DispatchRecommendationCard({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: RecommendationResponse }>(`/intelligence/dispatch-recommendation?tripId=${tripId}`);
      setRecommendation(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {t('dispatch.title')}
          </h3>
        </div>
        {!recommendation && (
          <Button size="xs" onClick={fetchRecommendation} loading={loading} variant="outline">
            {!loading && t('dispatch.getRecommendation')}
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Spinner size={12} />
          {t('dispatch.analyzing')}
        </div>
      )}

      {recommendation?.topPick && (
        <div className="rounded-md border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {t('dispatch.topPick')}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {recommendation.topPick.vehicleRegistration}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {recommendation.topPick.reasonSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {recommendation?.alternatives && recommendation.alternatives.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Lightbulb className="h-3 w-3" />
            {showAlternatives
              ? t('dispatch.hideAlternatives')
              : t('dispatch.showAlternatives', { count: recommendation.alternatives.length })}
            {showAlternatives ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showAlternatives && (
            <ul className="mt-2 space-y-1.5">
              {recommendation.alternatives.map((alt) => (
                <li
                  key={alt.vehicleId}
                  className="rounded-md border bg-background p-2.5 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {alt.vehicleRegistration}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Score: {alt.score}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alt.reasonSummary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
