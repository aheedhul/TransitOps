import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Keyboard } from 'lucide-react';
import { cn } from '../../lib/utils.js';

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
    { keys: ['⌘', 'K'], label: t('shortcuts.commandPalette') },
    { keys: ['⌘', 'N'], label: t('shortcuts.newTrip') },
    { keys: ['/'], label: t('shortcuts.search') },
    { keys: ['?'], label: t('shortcuts.help') },
    { keys: ['Esc'], label: t('shortcuts.closeModal') },
  ];

  const HelpOverlay = open ? (
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-floating animate-scale-in">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Keyboard className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-semibold">{t('shortcuts.title')}</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-3">
          <div className="space-y-1">
            {shortcuts.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50"
              >
                <span className="text-sm text-foreground">{s.label}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className={cn(
                        'flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold text-foreground',
                      )}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          Press <kbd className="rounded border border-border bg-background px-1 font-mono">?</kbd> anytime to show this dialog
        </div>
      </div>
    </div>
  ) : null;

  return { HelpOverlay, open, setOpen };
}
