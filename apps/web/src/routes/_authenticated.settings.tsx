import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Building2,
  Sun,
  Moon,
  Monitor,
  User,
  LogOut,
  Bell,
  Smartphone,
  Mail,
  Globe,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { useThemeStore } from '../features/theme/store.js';
import { PageHeader } from '../components/ui/empty-state.js';
import { Section } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Avatar } from '../components/ui/avatar.js';
import { Badge, type BadgeVariant } from '../components/ui/badge.js';
import { cn } from '../lib/utils.js';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
});

const ROLE_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  admin: { label: 'Administrator', variant: 'info' },
  fleet_manager: { label: 'Fleet Manager', variant: 'success' },
  driver: { label: 'Driver', variant: 'warning' },
  safety_officer: { label: 'Safety Officer', variant: 'warning' },
  financial_analyst: { label: 'Financial Analyst', variant: 'info' },
};

function SettingsPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { theme, setTheme } = useThemeStore();
  const [pushEnabled, setPushEnabled] = useState(false);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  const roleConfig = session ? ROLE_LABELS[session.role] : null;

  const themeOptions: { key: 'light' | 'dark' | 'system'; label: string; description: string; Icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', description: 'Bright and clean', Icon: Sun },
    { key: 'dark', label: 'Dark', description: 'Easy on the eyes', Icon: Moon },
    { key: 'system', label: 'System', description: 'Match your OS', Icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.settings')}
        description="Manage your account, organization, and preferences."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section
          title="Profile"
          description="Your account information"
          className="lg:col-span-2"
        >
          {session && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={session.name} size="xl" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">{session.name}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {session.email}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {roleConfig && (
                      <Badge variant={roleConfig.variant} size="sm">
                        {roleConfig.label}
                      </Badge>
                    )}
                    <Badge variant="success" size="sm" dot>
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
                <div className="rounded-md border bg-background p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    User ID
                  </p>
                  <p className="mt-1 truncate font-mono text-xs">{session.userId}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Organization
                  </p>
                  <p className="mt-1 truncate font-mono text-xs">{session.orgId}</p>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Quick Actions" description="Account shortcuts">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </Section>
      </div>

      <Section
        title="Appearance"
        description="Choose how TransitOps looks for you"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {themeOptions.map(({ key, label, description, Icon }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={cn(
                  'group flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'bg-card hover:border-primary/40',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Notifications"
        description="Control what notifications you receive"
      >
        <div className="space-y-2">
          <ToggleRow
            Icon={Bell}
            title="Push notifications"
            description="Get real-time alerts for critical fleet events"
            enabled={pushEnabled}
            onChange={setPushEnabled}
          />
          <ToggleRow
            Icon={Mail}
            title="Email digest"
            description="Daily summary of fleet activity"
            enabled={true}
            onChange={() => {}}
            disabled
          />
          <ToggleRow
            Icon={Smartphone}
            title="SMS alerts"
            description="For emergency and safety incidents only"
            enabled={true}
            onChange={() => {}}
            disabled
          />
        </div>
      </Section>

      <Section
        title="Organization"
        description="Your workspace details"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow Icon={Building2} label="Organization" value="TransitOps Demo" />
          <InfoRow Icon={Globe} label="Currency" value="INR (₹)" />
          <InfoRow Icon={Globe} label="Timezone" value="Asia/Kolkata (UTC+5:30)" />
          <InfoRow Icon={User} label="Active Users" value="5" />
        </div>
      </Section>
    </div>
  );
}

function ToggleRow({
  Icon,
  title,
  description,
  enabled,
  onChange,
  disabled,
}: {
  Icon: typeof Bell;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          enabled ? 'bg-primary' : 'bg-muted',
          disabled && 'cursor-not-allowed',
        )}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform',
            enabled ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

function InfoRow({
  Icon,
  label,
  value,
}: {
  Icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
