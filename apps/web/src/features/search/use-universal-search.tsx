import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../trips/api/client.js';

interface SearchResult {
  type: 'vehicle' | 'driver' | 'trip' | 'customer';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const ENTITY_LABELS: Record<string, string> = {
  vehicle: 'search.vehicles',
  driver: 'search.drivers',
  trip: 'search.trips',
  customer: 'search.customers',
};

export function useUniversalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchEntities = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
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
          subtitle: t('search.vehicles'),
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
          title: `${tr.sourceLabel} \u2192 ${tr.destinationLabel}`,
          subtitle: t('search.trips'),
          url: `/trips/${tr.id}`,
        })),
        ...(customers.data ?? []).map((c) => ({
          type: 'customer' as const,
          id: c.id,
          title: c.name,
          subtitle: c.contactName ?? '',
          url: `/customers`,
        })),
      ];
      setResults(all.slice(0, 20));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchEntities(query);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchEntities]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !open && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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
      inputRef.current?.focus();
    }
  }, [open]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const list = acc[r.type] ?? [];
    list.push(r);
    acc[r.type] = list;
    return acc;
  }, {});

  const typeIcons: Record<string, string> = {
    vehicle: '\u{1F69A}',
    driver: '\u{1F464}',
    trip: '\u{1F4CD}',
    customer: '\u{1F3E2}',
  };

  const SearchOverlay = open ? (
    <div className="fixed inset-0 z-[90]">
      <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[15%] w-full max-w-xl -translate-x-1/2 rounded-lg border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <div className="px-3 py-4 text-center text-sm text-muted-foreground">{t('common.loading')}</div>}
          {!loading && query.length < 3 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">{t('search.typeMore')}</div>
          )}
          {!loading && query.length >= 3 && results.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">{t('search.noResults')}</div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">
                {typeIcons[type] ?? ''} {t(ENTITY_LABELS[type] ?? type)}
              </div>
              {items.map((item) => (
                <button
                  key={`${type}-${item.id}`}
                  onClick={() => { navigate({ to: item.url as any }); setOpen(false); }}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="flex-1 text-left">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return { SearchOverlay, open, setOpen };
}
