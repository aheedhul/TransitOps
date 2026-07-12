import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../features/trips/api/client.js';
import { EmptyAuditState } from '../components/ui/empty-state.js';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorKind: string;
  occurredAt: string;
}

function AuditLogScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    api.get<{ data: AuditEntry[] }>('/audit-logs')
      .then((data) => setLogs(data.data ?? []))
      .catch(() => {});
  }, []);

  const filtered = logs.filter((log) => {
    if (filterEntity && log.entityType !== filterEntity) return false;
    if (filterAction && !log.action.includes(filterAction)) return false;
    return true;
  });

  const entityTypes = [...new Set(logs.map((l) => l.entityType))];

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('audit.title')}</h1>

      <div className="mt-4 flex gap-4">
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="rounded-md border bg-background px-3 py-1 text-sm"
        >
          <option value="">{t('audit.allEntities')}</option>
          {entityTypes.map((et) => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>
        <input
          type="text"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          placeholder={t('audit.filterByAction')}
          className="rounded-md border bg-background px-3 py-1 text-sm"
        />
        <button
          onClick={() => {
            const csv = [
              ['ID', 'Action', 'Entity', 'Actor', 'Time'].join(','),
              ...filtered.map((l) =>
                [l.id, l.action, `${l.entityType}/${l.entityId}`, l.actorKind, l.occurredAt].join(','),
              ),
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'audit-log.csv';
            a.click();
          }}
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {t('audit.exportCsv')}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2">{t('audit.time')}</th>
              <th className="px-3 py-2">{t('audit.action')}</th>
              <th className="px-3 py-2">{t('audit.entity')}</th>
              <th className="px-3 py-2">{t('audit.actor')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((log) => (
              <tr key={log.id} className="border-b hover:bg-muted/50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(log.occurredAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{log.action}</td>
                <td className="px-3 py-2">{log.entityType}/{log.entityId?.slice(0, 8)}</td>
                <td className="px-3 py-2 capitalize">{log.actorKind}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyAuditState />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/audit-logs')({
  component: AuditLogScreen,
});
