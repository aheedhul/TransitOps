import { create } from 'zustand';

export interface AuthSession {
  userId: string;
  role: string;
  orgId: string;
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

interface AuthStore {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  setSession: (session) => {
    set({ session });
  },
  clearSession: () => {
    set({ session: null });
  },
  isAuthenticated: () => get().session !== null,
  hasRole: (role) => get().session?.role === role,
}));
