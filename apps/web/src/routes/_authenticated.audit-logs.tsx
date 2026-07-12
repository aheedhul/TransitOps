import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Search, Filter, ScrollText, Clock, User, Database, Hash } from 'lucide-react';
import { api } from '../features/trips/api/client.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Card } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Input, Select } from '../components/ui/input.js';
import { Spinner } from '../components/ui/spinner.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui/table.js';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorKind: string;
  occurredAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
  update: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20',
  delete: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
  dispatch: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  start: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',
  complete: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
  cancel: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
};

function getActionColor(action: string): string {
  const key = action.toLowerCase().split('.')[0] ?? action;
  return ACTION_COLORS[key] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20';
}

function AuditLogScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: AuditEntry[] }>('/audit-logs')
      .then((data) => setLogs(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    if (filterEntity && log.entityType !== filterEntity) return false;
    if (filterAction && !log.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!log.action.toLowerCase().includes(q) && !log.entityType.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const entityTypes = Array.from(new Set(logs.map((l) => l.entityType)));

  const exportCsv = () => {
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
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit.title')}
        description={`${logs.length} audit entries. Complete history of every action in the system.`}
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={exportCsv}
          >
            {t('audit.exportCsv')}
          </Button>
        }
      />

      <Card className="p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            type="search"
            placeholder="Search action or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
            <option value="">All Entities</option>
            {entityTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </Select>
          <Input
            type="text"
            placeholder="Filter by action (e.g. dispatch, create)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            leftIcon={<Filter className="h-4 w-4" />}
          />
        </div>
      </Card>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading audit log…</span>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty>
                <EmptyState
                  icon={<ScrollText className="h-5 w-5" />}
                  title={t('audit.noEntries')}
                  description="No audit entries match your filters."
                />
              </TableEmpty>
            ) : (
              filtered.slice(0, 100).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(log.occurredAt).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getActionColor(log.action)}`}
                    >
                      <Hash className="h-2.5 w-2.5" />
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-xs">
                        {log.entityType}/{log.entityId?.slice(0, 8)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs capitalize text-muted-foreground">
                        {log.actorKind}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/audit-logs')({
  component: AuditLogScreen,
});
