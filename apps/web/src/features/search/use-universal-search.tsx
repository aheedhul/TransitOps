import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Truck, Users, Route as RouteIcon, Building2, ArrowRight, X } from 'lucide-react';
import { api } from '../trips/api/client.js';
import { cn } from '../../lib/utils.js';
import { Spinner } from '../../components/ui/spinner.js';

interface SearchResult {
  type: 'vehicle' | 'driver' | 'trip' | 'customer';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const ENTITY_LABELS: Record<string, string> = {
  vehicle: 'Vehicles',
  driver: 'Drivers',
  trip: 'Trips',
  customer: 'Customers',
};

const ENTITY_ICONS = {
  vehicle: Truck,
  driver: Users,
  trip: RouteIcon,
  customer: Building2,
};

const ENTITY_COLORS = {
  vehicle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  driver: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  trip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  customer: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

export function useUniversalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchEntities = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [vehicles, drivers, trips, customers] = await Promise.all([
        api.get<{ data: { id: string; registrationNumber?: string; name?: string; sourceLabel?: string; destinationLabel?: string }[] }>(`/vehicles?page=1&search=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
        api.get<{ data: { id: string; name: string; licenseNumber: string }[] }>(`/drivers?page=1&search=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
        api.get<{ data: { id: string; sourceLabel: string; destinationLabel: string }[] }>(`/trips?page=1&search=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
        api.get<{ data: { id: string; name: string; contactName?: string }[] }>(`/customers?page=1&search=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
      ]);

      const all: SearchResult[] = [
        ...(vehicles.data ?? []).map((v) => ({
          type: 'vehicle' as const,
          id: v.id,
          title: v.registrationNumber ?? v.name ?? v.id,
          subtitle: 'Vehicle',
          url: `/vehicles`,
        })),
        ...(drivers.data ?? []).map((d) => ({
          type: 'driver' as const,
          id: d.id,
          title: d.name,
          subtitle: d.licenseNumber,
          url: `/drivers`,
        })),
        ...(trips.data ?? []).map((tr) => ({
          type: 'trip' as const,
          id: tr.id,
          title: `${tr.sourceLabel} → ${tr.destinationLabel}`,
          subtitle: 'Trip',
          url: `/trips/${tr.id}`,
        })),
        ...(customers.data ?? []).map((c) => ({
          type: 'customer' as const,
          id: c.id,
          title: c.name,
          subtitle: c.contactName ?? 'Customer',
          url: `/customers`,
        })),
      ];
      setResults(all.slice(0, 24));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchEntities(query);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchEntities]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === '/' && !open && !isInput) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[activeIndex];
        if (r) {
          void navigate({ to: r.url as '/vehicles' | '/drivers' | `/trips/${string}` | '/customers' });
          setOpen(false);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, results, activeIndex, navigate]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const list = acc[r.type] ?? [];
    list.push(r);
    acc[r.type] = list;
    return acc;
  }, {});

  const flatList = results;

  const SearchOverlay = open ? (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-floating animate-scale-in">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search vehicles, drivers, trips, customers…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-muted-foreground">
              <Spinner size={16} />
              Searching…
            </div>
          )}
          {!loading && query.length < 2 && (
            <div className="flex flex-col items-center gap-2 px-3 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Search your fleet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Find any vehicle, driver, trip, or customer. Type at least 2 characters.
              </p>
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No matching results</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          )}
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = ENTITY_ICONS[type as keyof typeof ENTITY_ICONS] ?? Truck;
            const color = ENTITY_COLORS[type as keyof typeof ENTITY_COLORS] ?? ENTITY_COLORS.vehicle;
            return (
              <div key={type} className="mb-1 last:mb-0">
                <p className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded',
                      color,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  {ENTITY_LABELS[type] ?? type}
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                    {items.length}
                  </span>
                </p>
                {items.map((item) => {
                  const globalIndex = flatList.indexOf(item);
                  const isActive = globalIndex === activeIndex;
                  return (
                    <button
                      key={`${type}-${item.id}`}
                      type="button"
                      onClick={() => {
                        void navigate({ to: item.url as '/vehicles' | '/drivers' | `/trips/${string}` | '/customers' });
                        setOpen(false);
                      }}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                        isActive ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-left font-medium text-foreground">{item.title}</p>
                        <p className="truncate text-left text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 font-mono">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1 font-mono">↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 font-mono">↵</kbd>
              open
            </span>
          </div>
          <span>Press <kbd className="rounded border border-border bg-background px-1 font-mono">/</kbd> to search</span>
        </div>
      </div>
    </div>
  ) : null;

  return { SearchOverlay, open, setOpen };
}
