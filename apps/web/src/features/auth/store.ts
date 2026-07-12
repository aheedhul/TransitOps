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

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem('transitops-session');
    if (raw) return JSON.parse(raw) as AuthSession;
  } catch { /* ignore */ }
  return null;
}

function saveSession(session: AuthSession | null) {
  try {
    if (session) {
      localStorage.setItem('transitops-session', JSON.stringify(session));
    } else {
      localStorage.removeItem('transitops-session');
    }
  } catch { /* ignore */ }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: loadSession(),
  setSession: (session) => {
    saveSession(session);
    set({ session });
  },
  clearSession: () => {
    saveSession(null);
    set({ session: null });
  },
  isAuthenticated: () => get().session !== null,
  hasRole: (role) => get().session?.role === role,
}));
