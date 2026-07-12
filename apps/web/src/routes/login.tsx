import { useState, type SyntheticEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  BarChart3,
  Users,
  CheckCircle2,
  Mail,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { Button } from '../components/ui/button.js';
import { Field, Input } from '../components/ui/input.js';
import { cn } from '../lib/utils.js';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(0);

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

  const demoAccounts = [
    { email: 'admin@transitops.demo', password: 'TransitOps@123', role: 'Administrator', name: 'Admin User' },
    { email: 'fleet_manager@transitops.demo', password: 'Demo@123', role: 'Fleet Manager', name: 'Fleet Manager' },
    { email: 'driver@transitops.demo', password: 'Demo@123', role: 'Driver', name: 'Driver User' },
    { email: 'safety_officer@transitops.demo', password: 'Demo@123', role: 'Safety Officer', name: 'Safety Officer' },
    { email: 'financial_analyst@transitops.demo', password: 'Demo@123', role: 'Financial Analyst', name: 'Financial Analyst' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* Left brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl" />
            <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-soft">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">TransitOps</p>
              <p className="text-xs text-sidebar-muted">Intelligent Fleet Operations</p>
            </div>
          </div>

          <div className="relative space-y-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <Sparkles className="h-3 w-3" />
                <span>AI-Powered Fleet ERP</span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance xl:text-4xl">
                Run your entire fleet from a single, beautiful command center.
              </h1>
              <p className="mt-3 max-w-md text-sm text-sidebar-muted">
                Real-time vehicle tracking, intelligent dispatch, fuel analytics, and maintenance
                intelligence — all in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FeatureItem icon={MapPin} label="Live GPS" sublabel="Real-time tracking" />
              <FeatureItem icon={BarChart3} label="Smart Reports" sublabel="Cost & ESG analytics" />
              <FeatureItem icon={ShieldCheck} label="RBAC + Audit" sublabel="5 role types" />
              <FeatureItem icon={Users} label="Driver Safety" sublabel="Score & compliance" />
            </div>
          </div>

          <div className="relative flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground">All systems operational</p>
              <p className="text-[10px] text-sidebar-muted">v1.0 · Last sync just now</p>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-sm">
            <div className="mb-7 flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm font-bold">TransitOps</p>
            </div>

            <div className="mb-7 space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your account to continue.
              </p>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                  {error}
                </div>
              )}

              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@transitops.demo"
                  leftIcon={<Mail className="h-4 w-4" />}
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  autoComplete="current-password"
                />
              </Field>

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {!loading && (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Demo accounts</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Click to fill
                </span>
              </div>
              <div className="space-y-1">
                {demoAccounts.map((acc, i) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => setSelectedDemo(i)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      selectedDemo === i
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          selectedDemo === i ? 'bg-primary' : 'bg-muted-foreground/40',
                        )}
                      />
                      <span className="truncate font-medium text-foreground">{acc.role}</span>
                    </div>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {acc.email}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                All demo passwords: <span className="font-mono">Demo@123</span> (admin:{' '}
                <span className="font-mono">TransitOps@123</span>)
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By signing in, you agree to our{' '}
              <a className="text-foreground underline-offset-4 hover:underline" href="#">
                Terms
              </a>{' '}
              and{' '}
              <a className="text-foreground underline-offset-4 hover:underline" href="#">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: typeof MapPin;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-sidebar-foreground">{label}</p>
        <p className="truncate text-[10px] text-sidebar-muted">{sublabel}</p>
      </div>
    </div>
  );
}
