import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';

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
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('dispatch.title')}</h3>
        {!recommendation && (
          <button
            onClick={fetchRecommendation}
            disabled={loading}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? t('dispatch.analyzing') : t('dispatch.getRecommendation')}
          </button>
        )}
      </div>

      {recommendation?.topPick && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200">
              {t('dispatch.topPick')}
            </span>
            <span className="text-sm font-medium">{recommendation.topPick.vehicleRegistration}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{recommendation.topPick.reasonSummary}</p>
        </div>
      )}

      {recommendation?.alternatives && recommendation.alternatives.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="text-xs text-primary hover:underline"
          >
            {showAlternatives
              ? t('dispatch.hideAlternatives')
              : t('dispatch.showAlternatives', { count: recommendation.alternatives.length })}
          </button>
          {showAlternatives && (
            <div className="mt-2 space-y-2">
              {recommendation.alternatives.map((alt) => (
                <div key={alt.vehicleId} className="rounded-md border bg-muted/30 p-2">
                  <span className="text-sm font-medium">{alt.vehicleRegistration}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alt.reasonSummary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
