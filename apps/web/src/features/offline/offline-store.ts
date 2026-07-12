import { create } from 'zustand';

export type SyncState = 'connected' | 'syncing' | 'offline' | 'issues';

interface OfflineStore {
  syncState: SyncState;
  outboxCount: number;
  conflictCount: number;
  paused: boolean;

  setSyncState: (state: SyncState) => void;
  setOutboxCount: (count: number) => void;
  setConflictCount: (count: number) => void;
  setPaused: (paused: boolean) => void;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  syncState: 'connected',
  outboxCount: 0,
  conflictCount: 0,
  paused: false,

  setSyncState: (syncState) => set({ syncState }),
  setOutboxCount: (outboxCount) => set({ outboxCount }),
  setConflictCount: (conflictCount) => set({ conflictCount }),
  setPaused: (paused) => set({ paused }),
}));
