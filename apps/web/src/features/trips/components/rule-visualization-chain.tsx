import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

interface RuleResult {
  ruleName: string;
  passed: boolean;
  message: string;
}

interface RuleVisualizationChainProps {
  tripStatus: string;
  vehicleId?: string;
  driverId?: string;
}

export function RuleVisualizationChain({ tripStatus, vehicleId, driverId }: RuleVisualizationChainProps) {
  const { t } = useTranslation();

  const rules: RuleResult[] = [
    {
      ruleName: 'Vehicle Available',
      passed: !!vehicleId,
      message: vehicleId ? 'Vehicle is assigned' : 'No vehicle assigned',
    },
    {
      ruleName: 'Driver Available',
      passed: !!driverId,
      message: driverId ? 'Driver is assigned' : 'No driver assigned',
    },
    {
      ruleName: 'Trip Draft',
      passed: tripStatus === 'draft',
      message: tripStatus === 'draft' ? 'Trip is in draft status' : `Trip is ${tripStatus}`,
    },
  ];

  const allPassed = rules.every((r) => r.passed);
  const warnCount = rules.filter((r) => !r.passed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {allPassed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {t('dispatch.readyToDispatch')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20">
            <XCircle className="h-3 w-3" />
            {t('dispatch.cannotDispatch')}
          </span>
        )}
        {warnCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('dispatch.warnings', { count: warnCount })}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.ruleName}
            className={cn(
              'flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs transition-colors',
              rule.passed
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-red-500/20 bg-red-500/5',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                rule.passed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white',
              )}
            >
              {rule.passed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'font-semibold',
                  rule.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
                )}
              >
                {rule.ruleName}
              </p>
              <p className="mt-0.5 text-muted-foreground">{rule.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
