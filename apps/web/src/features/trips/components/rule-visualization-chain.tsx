import { useTranslation } from 'react-i18next';

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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            allPassed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {allPassed ? t('dispatch.readyToDispatch') : t('dispatch.cannotDispatch')}
        </span>
        {warnCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('dispatch.warnings', { count: warnCount })}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {rules.map((rule) => (
          <div key={rule.ruleName} className="flex items-center gap-2 text-xs">
            <span className={rule.passed ? 'text-green-500' : 'text-red-500'}>
              {rule.passed ? '✓' : '✗'}
            </span>
            <span className="text-muted-foreground">{rule.ruleName}:</span>
            <span>{rule.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
