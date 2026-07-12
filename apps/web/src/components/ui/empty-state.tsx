import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  icon?: 'vehicles' | 'drivers' | 'trips' | 'maintenance' | 'fuel' | 'reports' | 'notifications' | 'audit' | 'search' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  vehicles: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l4-4h10l4 4M4 10h16v11H4V10z" />
    </svg>
  ),
  drivers: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  trips: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  maintenance: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  fuel: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  reports: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  notifications: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  audit: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  search: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  generic: (
    <svg className="h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
};

export function EmptyState({ icon = 'generic', title, description, actionLabel, onAction }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4">{ICONS[icon] ?? ICONS.generic}</div>
      <h3 className="text-lg font-medium text-foreground">{title ?? t('emptyStates.defaultTitle')}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyVehicleState({ onAction }: { onAction?: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="vehicles"
      title={t('emptyStates.noVehicles')}
      description={t('emptyStates.noVehiclesDesc')}
      actionLabel={onAction ? t('common.create') : undefined}
      onAction={onAction}
    />
  );
}

export function EmptyDriverState({ onAction }: { onAction?: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="drivers"
      title={t('emptyStates.noDrivers')}
      description={t('emptyStates.noDriversDesc')}
      actionLabel={onAction ? t('common.create') : undefined}
      onAction={onAction}
    />
  );
}

export function EmptyTripState({ onAction }: { onAction?: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="trips"
      title={t('emptyStates.noTrips')}
      description={t('emptyStates.noTripsDesc')}
      actionLabel={onAction ? t('common.create') : undefined}
      onAction={onAction}
    />
  );
}

export function EmptyNotificationState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="notifications"
      title={t('emptyStates.noNotifications')}
      description={t('emptyStates.noNotificationsDesc')}
    />
  );
}

export function EmptyAuditState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="audit"
      title={t('emptyStates.noAuditLogs')}
      description={t('emptyStates.noAuditLogsDesc')}
    />
  );
}

export function EmptyMaintenanceState({ onAction }: { onAction?: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="maintenance"
      title={t('emptyStates.noMaintenance')}
      description={t('emptyStates.noMaintenanceDesc')}
      actionLabel={onAction ? t('common.create') : undefined}
      onAction={onAction}
    />
  );
}

export function EmptyReportState({ entity }: { entity: string }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="reports"
      title={t('emptyStates.noReportData')}
      description={t('emptyStates.noReportDataDesc', { entity })}
    />
  );
}

export function EmptySearchState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="search"
      title={t('emptyStates.noSearchResults')}
      description={t('emptyStates.noSearchResultsDesc')}
    />
  );
}
