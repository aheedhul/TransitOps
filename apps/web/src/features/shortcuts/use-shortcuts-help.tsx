import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useShortcutsHelp() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const shortcuts = [
    { keys: ['Ctrl', 'N'], label: t('shortcuts.newTrip') },
    { keys: ['/', ''], label: t('shortcuts.search') },
    { keys: ['Ctrl', 'K'], label: t('shortcuts.commandPalette') },
    { keys: ['Esc', ''], label: t('shortcuts.closeModal') },
    { keys: ['?', ''], label: t('shortcuts.help') },
  ];

  const HelpOverlay = open ? (
    <div className="fixed inset-0 z-[95]">
      <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[20%] w-full max-w-sm -translate-x-1/2 rounded-lg border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('shortcuts.title')}</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span>{s.label}</span>
              <div className="flex gap-1">
                {s.keys.filter(Boolean).map((k) => (
                  <kbd key={k} className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return { HelpOverlay, open, setOpen };
}
