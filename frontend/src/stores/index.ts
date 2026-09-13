import { create } from 'zustand';
import type { User, Case, Alert, WatchlistEntry } from '../types';
import { API_BASE } from '../utils/api';
import { useInvestigationStore } from './investigation';

// Auth Store
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  mfaPendingUser: User | null;
  tempMfaToken: string | null;
  login: (email: string, password: string, isOAuth?: boolean) => Promise<boolean>;
  verifyMFA: (code: string) => Promise<boolean>;
  logout: () => void;
  setMfaPending: (user: User | null, token: string | null) => void;
  hydrateAuth: () => void;
}

const getStoredUser = (): User | null => {
  try {
    const stored = sessionStorage.getItem('user') || localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  mfaPendingUser: null,
  tempMfaToken: null,

  hydrateAuth: () => {
    // Use per-tab sessionStorage so fresh visits always land on the Login page first
    const token = sessionStorage.getItem('token');
    const userStored = getStoredUser();
    if (token && userStored) {
      set({ user: userStored, isAuthenticated: true });
    } else {
      // Purge any stale persistent tokens from old sessions
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  login: async (email: string, _password: string, isOAuth = false) => {
    // Clean inputs
    const cleanEmail = email.trim();
    const cleanPassword = _password.trim();

    if (!cleanEmail || !cleanPassword) {
      return false;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const formData = new URLSearchParams();
      formData.append('username', cleanEmail);
      formData.append('password', cleanPassword);

      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.requires_mfa) {
          const mfaUser: User = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            role: data.user.role,
            isActive: data.user.is_active,
            mfaEnabled: data.user.mfa_enabled,
            createdAt: data.user.created_at
          };
          set({ 
            mfaPendingUser: mfaUser, 
            tempMfaToken: data.temp_token 
          });
          return true;
        }
        const loggedUser: User = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          role: data.user.role,
          isActive: data.user.is_active,
          mfaEnabled: data.user.mfa_enabled,
          createdAt: data.user.created_at
        };
        sessionStorage.setItem('token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        sessionStorage.setItem('user', JSON.stringify(loggedUser));
        set({ user: loggedUser, isAuthenticated: true, mfaPendingUser: null, tempMfaToken: null });
        return true;
      }
    } catch {
      clearTimeout(timer);
      return false;
    }

    clearTimeout(timer);
    return false;
  },
  verifyMFA: async (code: string) => {
    const cleanCode = code.trim();
    const pending = get().mfaPendingUser;
    const tempToken = get().tempMfaToken;

    if (!pending) return false;

    if (tempToken) {
      const mfaController = new AbortController();
      const mfaTimer = setTimeout(() => mfaController.abort(), 6000);

      try {
        const response = await fetch(`${API_BASE}/api/auth/mfa/verify?temp_token=${tempToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanCode }),
          signal: mfaController.signal
        });
        clearTimeout(mfaTimer);

        if (response.ok) {
          const data = await response.json();
          const loggedUser: User = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            role: data.user.role,
            isActive: data.user.is_active,
            mfaEnabled: data.user.mfa_enabled,
            createdAt: data.user.created_at
          };
          sessionStorage.setItem('token', data.access_token);
          sessionStorage.setItem('refresh_token', data.refresh_token);
          sessionStorage.setItem('user', JSON.stringify(loggedUser));
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({
            user: loggedUser,
            isAuthenticated: true,
            mfaPendingUser: null,
            tempMfaToken: null
          });
          return true;
        }
      } catch {
        clearTimeout(mfaTimer);
      }
    }

    return false;
  },
  logout: () => {
    sessionStorage.clear();
    localStorage.clear();
    set({ user: null, isAuthenticated: false, mfaPendingUser: null, tempMfaToken: null });
  },
  setMfaPending: (user: User | null, token: string | null) => set({ mfaPendingUser: user, tempMfaToken: token })
}));

// Navigation Store
interface NavStore {
  sidebarOpen: boolean;
  currentPage: string;
  showShortcuts: boolean;
  toggleSidebar: () => void;
  setPage: (page: string) => void;
  setShowShortcuts: (v: boolean) => void;
}

export const useNavStore = create<NavStore>((set) => ({
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  currentPage: 'dashboard',
  showShortcuts: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPage: (page: string) => set({ currentPage: page }),
  setShowShortcuts: (v) => set({ showShortcuts: v }),
}));

const mapCasePayload = (item: any): Case => ({
  id: item.id,
  caseNumber: item.case_number ?? item.caseNumber ?? '',
  title: item.title ?? '',
  description: item.description ?? '',
  priority: item.priority ?? 'medium',
  status: item.status ?? 'open',
  investigatorId: item.investigator_id ?? item.investigatorId ?? '',
  investigatorName: item.investigator_name ?? item.investigatorName ?? '',
  department: item.department ?? '',
  notes: item.notes,
  createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
  updatedAt: item.updated_at ?? item.updatedAt ?? new Date().toISOString(),
  closedAt: item.closed_at ?? item.closedAt,
  walletCount: Array.isArray(item.wallets) ? item.wallets.length : item.walletCount ?? 0,
  evidenceCount: Array.isArray(item.evidence) ? item.evidence.length : item.evidenceCount ?? 0,
});

// Cases Store
interface CaseStore {
  cases: Case[];
  selectedCase: Case | null;
  selectCase: (c: Case | null) => void;
  addCase: (c: Case) => void;
  updateCase: (id: string, updates: Partial<Case>) => void;
  setCases: (cases: Case[]) => void;
  loadCases: () => Promise<void>;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  selectedCase: null,
  selectCase: (c) => set({ selectedCase: c }),
  addCase: (c) => set((s) => ({ cases: [c, ...s.cases] })),
  updateCase: (id, updates) => set((s) => ({
    cases: s.cases.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  setCases: (cases) => set({ cases }),
  loadCases: async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/api/cases`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        const mappedCases = Array.isArray(data) ? data.map(mapCasePayload) : [];
        const currentSelection = get().selectedCase;
        set({
          cases: mappedCases,
          selectedCase: currentSelection && mappedCases.some((c) => c.id === currentSelection.id)
            ? currentSelection
            : mappedCases[0] ?? null,
        });
      }
    } catch (err) {
      console.error('Failed to load cases from backend:', err);
    }
  },
}));

// Alerts Store
interface AlertStore {
  alerts: Alert[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  get unreadCount() { return get().alerts.filter((a) => !a.isRead).length; },
  markRead: (id) => set((s) => ({
    alerts: s.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
  })),
  markAllRead: () => set((s) => ({
    alerts: s.alerts.map((a) => ({ ...a, isRead: true })),
  })),
}));

// Watchlist Store
interface WatchlistStore {
  entries: WatchlistEntry[];
  addEntry: (entry: WatchlistEntry) => void;
  removeEntry: (id: string) => void;
}

export const useWatchlistStore = create<WatchlistStore>((set) => ({
  entries: [],
  addEntry: (entry) => set((s) => ({ entries: [entry, ...s.entries] })),
  removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
}));

// Blockchain Analysis Store
interface BlockchainStore {
  searchAddress: string;
  isAnalyzing: boolean;
  setSearchAddress: (addr: string) => void;
  setAnalyzing: (v: boolean) => void;
}

export const useBlockchainStore = create<BlockchainStore>((set) => ({
  searchAddress: '',
  isAnalyzing: false,
  setSearchAddress: (addr) => {
    const clean = addr.trim();
    set({ searchAddress: clean });
  },
  setAnalyzing: (v) => set({ isAnalyzing: v }),
}));
