import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Search, Users, ShieldCheck, Calendar, Mail } from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Card } from '../components/ui/card.js';
import { Input } from '../components/ui/input.js';
import { Avatar } from '../components/ui/avatar.js';
import { StatusPill, type StatusKind } from '../components/ui/status-pill.js';
import { Spinner } from '../components/ui/spinner.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

const ROLE_BADGES: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'neutral'; Icon: typeof ShieldCheck }> = {
  admin: { label: 'Administrator', variant: 'info', Icon: ShieldCheck },
  fleet_manager: { label: 'Fleet Manager', variant: 'success', Icon: ShieldCheck },
  driver: { label: 'Driver', variant: 'success', Icon: ShieldCheck },
  safety_officer: { label: 'Safety Officer', variant: 'warning', Icon: ShieldCheck },
  financial_analyst: { label: 'Financial Analyst', variant: 'info', Icon: ShieldCheck },
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20',
};

export const Route = createFileRoute('/_authenticated/users')({
  component: UsersPage,
});

function UsersPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!session) return;
    fetch('/api/v1/users', { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = users.filter((u) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.users')}
        description={`${users.length} team members. Manage roles, permissions, and access.`}
      />

      <Card className="p-3">
        <Input
          type="search"
          placeholder="Search users by name, email, or role..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </Card>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading users…</span>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No users found"
          description={filter ? 'Try a different search term.' : 'No users in your organization yet.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const roleConfig = ROLE_BADGES[u.role] ?? { label: u.role, variant: 'neutral' as StatusKind, Icon: ShieldCheck as typeof ShieldCheck };
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {u.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE_STYLES[roleConfig.variant] ?? ROLE_BADGE_STYLES.neutral}`}
                    >
                      <roleConfig.Icon className="h-3 w-3" />
                      {roleConfig.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={u.status as StatusKind} size="sm" />
                  </TableCell>
                  <TableCell>
                    {u.lastLoginAt ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(u.lastLoginAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">Never</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
