import { create } from 'zustand';

export type SyncState = 'connected' | 'syncing' | 'offline' | 'issues';

export interface ConflictEntry {
  idempotencyKey: string;
  type: string;
  entityId: string;
  payload: unknown;
  lastError: { code: string; message: string; retryable: boolean } | null;
}

interface OfflineStore {
  syncState: SyncState;
  state: SyncState;
  outboxCount: number;
  conflictCount: number;
  paused: boolean;
  lastSync: Date | null;
  conflicts: ConflictEntry[];
  triggerSync: () => void;

  setSyncState: (state: SyncState) => void;
  setOutboxCount: (count: number) => void;
  setConflictCount: (count: number) => void;
  setConflicts: (conflicts: ConflictEntry[]) => void;
  setPaused: (paused: boolean) => void;
  setLastSync: (date: Date) => void;
  setTriggerSync: (fn: () => void) => void;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  syncState: 'connected',
  state: 'connected',
  outboxCount: 0,
  conflictCount: 0,
  paused: false,
  lastSync: null,
  conflicts: [],
  triggerSync: () => {},

  setSyncState: (syncState) => set({ syncState, state: syncState }),
  setOutboxCount: (outboxCount) => set({ outboxCount }),
  setConflictCount: (conflictCount) => set({ conflictCount }),
  setConflicts: (conflicts) => set({ conflicts }),
  setPaused: (paused) => set({ paused }),
  setLastSync: (lastSync) => set({ lastSync }),
  setTriggerSync: (triggerSync) => set({ triggerSync }),
}));

export const useSyncStore = useOfflineStore;
