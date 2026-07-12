import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/store.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

export const Route = createFileRoute('/_authenticated/users')({
  component: UsersPage,
});

function UsersPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch('/api/v1/users', { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.users')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{users.length} users</p>
      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last Login</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-muted/50">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{u.role.replace('_', ' ')}</span></td>
                <td className="px-3 py-2 capitalize">{u.status}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
