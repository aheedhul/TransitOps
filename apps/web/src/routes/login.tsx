import { useState, type SyntheticEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../features/auth/store.js';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        setError(json.error?.message ?? 'Login failed');
        return;
      }

      const json = (await res.json()) as {
        data: {
          session: { userId: string; role: string; orgId: string; name: string; email: string };
          tokens: { accessToken: string; refreshToken: string };
        };
      };
      setSession({
        userId: json.data.session.userId,
        role: json.data.session.role,
        orgId: json.data.session.orgId,
        name: json.data.session.name,
        email: json.data.session.email,
        accessToken: json.data.tokens.accessToken,
        refreshToken: json.data.tokens.refreshToken,
      });

      void navigate({ to: '/dashboard' });
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20" />
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-secondary/30 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border bg-card/80 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">TransitOps</h1>
          <p className="mt-1 text-sm text-muted-foreground">Smart Transport Operations Platform</p>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="admin@transitops.demo"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              {t('auth.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? t('app.loading') : t('auth.login')}
          </button>
        </form>

        <div className="mt-6 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Demo accounts</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <span>admin@transitops.demo</span>
            <span className="text-right">TransitOps@123</span>
            <span>fleet_manager@transitops.demo</span>
            <span className="text-right">Demo@123</span>
            <span>driver@transitops.demo</span>
            <span className="text-right">Demo@123</span>
            <span>safety_officer@transitops.demo</span>
            <span className="text-right">Demo@123</span>
            <span>financial_analyst@transitops.demo</span>
            <span className="text-right">Demo@123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
