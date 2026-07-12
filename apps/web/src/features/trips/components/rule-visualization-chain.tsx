import { useEffect, useState } from 'react';
import { useDispatchCheck } from '../api/hooks.js';
import type { RuleResult } from '../api/types.js';

interface Props {
  vehicleId: string;
  driverId: string;
  cargoWeightKg: number;
  plannedDepartureAt?: string;
}

export function RuleVisualizationChain({ vehicleId, driverId, cargoWeightKg, plannedDepartureAt }: Props) {
  const check = useDispatchCheck();
  const [chain, setChain] = useState<RuleResult[]>([]);

  useEffect(() => {
    check.mutate(
      { vehicleId, driverId, cargoWeightKg, plannedDepartureAt },
      {
        onSuccess: (data) => {
          setChain(data.data.chain);
        },
      },
    );
  }, [vehicleId, driverId, cargoWeightKg, plannedDepartureAt]);

  const anyBlocked = chain.some((r) => !r.ok && r.severity === 'block');
  const warnCount = chain.filter((r) => !r.ok && r.severity === 'warn').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {anyBlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Cannot Dispatch
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Ready to Dispatch
          </span>
        )}
        {warnCount > 0 && (
          <span className="text-xs text-amber-600">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="space-y-1">
        {chain.map((rule, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs ${
              rule.ok
                ? 'border-green-200 bg-green-50'
                : rule.severity === 'block'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                rule.ok ? 'bg-green-500' : rule.severity === 'block' ? 'bg-red-500' : 'bg-amber-500'
              }`}
            />
            <span className="flex-1 font-medium">{rule.rule}</span>
            <span className="text-muted-foreground">{rule.message}</span>
            {rule.metadata && (
              <span className="text-muted-foreground/70">
                {rule.field && rule.metadata.maxCapacityKg
                  ? `${rule.metadata.cargoKg} / ${rule.metadata.maxCapacityKg}kg`
                  : ''}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
