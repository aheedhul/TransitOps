import { useEffect, useRef } from 'react';
import { initOfflineDB, teardownOfflineDB } from './db.js';
import { startSyncListeners, stopSyncListeners, pullDeltas, flushOutbox, seedInitialCache } from './sync-engine.js';
import { useAuthStore } from '../auth/store.js';
import { api } from '../trips/api/client.js';

export function useOfflineInit() {
  const initialized = useRef(false);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (initialized.current || !session) return;
    initialized.current = true;

    void (async () => {
      try {
        await initOfflineDB();
        startSyncListeners();

        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/sw.js');
          } catch {
            // service worker registration is non-critical
          }
        }

        try {
          const results = await Promise.all([
            api.get<{ data: unknown[] }>('/vehicles?page=1').catch(() => null),
            api.get<{ data: unknown[] }>('/drivers?page=1').catch(() => null),
            api.get<{ data: unknown[] }>('/trips?page=1').catch(() => null),
          ]);

          const vehicles = results[0]?.data ?? [];
          const drivers = results[1]?.data ?? [];
          const trips = results[2]?.data ?? [];

          await seedInitialCache({
            vehicles: vehicles as Record<string, unknown>[],
            drivers: drivers as Record<string, unknown>[],
            trips: trips as Record<string, unknown>[],
          });
        } catch {
          // initial cache seeding is best-effort
        }

        void flushOutbox().then(() => pullDeltas());
      } catch {
        // offline init failure is non-fatal
      }
    })();

    return () => {
      stopSyncListeners();
      void teardownOfflineDB();
    };
  }, [session]);
}
