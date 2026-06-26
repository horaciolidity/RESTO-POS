import { create } from 'zustand';
import { cashService } from '../services/cashService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAuthStore } from './useAuthStore';

export interface CashSession {
  id: string;
  openedBy: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: number;
  expectedBalance: number;
  actualBalance?: number;
  difference?: number;
  status: 'open' | 'closed';
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'ingreso' | 'egreso' | 'retiro';
  amount: number;
  description: string;
  time: string;
}

// ── localStorage helpers (fallback when Supabase not configured) ──
const LS_SESSION_KEY = (branchId: string) => `cash_session_${branchId}`;
const LS_MOVES_KEY   = (sessionId: string) => `cash_moves_${sessionId}`;

function saveLocalSession(branchId: string, session: CashSession) {
  try { localStorage.setItem(LS_SESSION_KEY(branchId), JSON.stringify(session)); } catch {}
}
function loadLocalSession(branchId: string): CashSession | null {
  try { const r = localStorage.getItem(LS_SESSION_KEY(branchId)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveLocalMovements(sessionId: string, moves: CashMovement[]) {
  try { localStorage.setItem(LS_MOVES_KEY(sessionId), JSON.stringify(moves)); } catch {}
}
function loadLocalMovements(sessionId: string): CashMovement[] {
  try { const r = localStorage.getItem(LS_MOVES_KEY(sessionId)); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function clearLocalSession(branchId: string, sessionId: string) {
  try {
    localStorage.removeItem(LS_SESSION_KEY(branchId));
    localStorage.removeItem(LS_MOVES_KEY(sessionId));
  } catch {}
}

// ── Map Supabase session → local type ──────────────────────────────
function mapSession(s: import('../services/cashService').SupabaseCashSession): CashSession {
  return {
    id: s.id,
    openedBy: s.opened_by_name,
    openedAt: s.opened_at,
    closedAt: s.closed_at,
    initialBalance: Number(s.initial_balance),
    expectedBalance: Number(s.expected_balance),
    actualBalance: s.actual_balance != null ? Number(s.actual_balance) : undefined,
    difference: s.difference != null ? Number(s.difference) : undefined,
    status: s.status
  };
}
function mapMovements(raw: import('../services/cashService').SupabaseCashMovement[]): CashMovement[] {
  return raw.map(m => ({
    id: m.id,
    sessionId: m.session_id,
    type: m.type,
    amount: Number(m.amount),
    description: m.description,
    time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));
}

interface CashState {
  currentSession: CashSession | null;
  movements: CashMovement[];
  loading: boolean;
  /** Call this explicitly with the branchId once user is authenticated */
  initializeCash: (branchId: string) => Promise<void>;
  openRegister: (openedBy: string, userId: string, initialBalance: number, branchId: string) => Promise<void>;
  closeRegister: (actualBalance: number, branchId: string) => Promise<void>;
  addMovement: (type: 'ingreso' | 'egreso' | 'retiro', amount: number, description: string, branchId: string) => Promise<void>;
}

// Prevent parallel initialize calls
let _initializing = false;

export const useCashStore = create<CashState>((set, get) => ({
  currentSession: null,
  movements: [],
  loading: false,

  initializeCash: async (branchId: string) => {
    if (_initializing) return;          // guard: skip if already loading
    _initializing = true;
    set({ loading: true });

    try {
      if (isSupabaseConfigured()) {
        // ── Supabase ──
        const session = await cashService.getCurrentSession(branchId);
        if (session) {
          const rawMoves = await cashService.getMovements(session.id);
          set({ currentSession: mapSession(session), movements: mapMovements(rawMoves) });
        } else {
          set({ currentSession: null, movements: [] });
        }
      } else {
        // ── localStorage only ──
        const local = loadLocalSession(branchId);
        if (local && local.status === 'open') {
          set({ currentSession: local, movements: loadLocalMovements(local.id) });
        } else {
          set({ currentSession: null, movements: [] });
        }
      }
    } catch (err) {
      console.error('[useCashStore.initializeCash]', err);
    } finally {
      set({ loading: false });
      _initializing = false;
    }
  },

  openRegister: async (openedBy, userId, initialBalance, branchId) => {
    set({ loading: true });

    if (isSupabaseConfigured()) {
      const tenantId = useAuthStore.getState().user?.tenantId || 'a1000000-0000-0000-0000-000000000001';
      // Pass undefined for empty userId so Postgres doesn't choke on empty string UUID
      const sessionId = await cashService.openRegister(
        openedBy,
        userId || undefined as any,
        initialBalance,
        branchId,
        tenantId
      );
      if (sessionId) {
        // Reload from DB so we get the exact record that was saved
        _initializing = false;                   // reset guard so initializeCash can run
        await get().initializeCash(branchId);
        return;
      }
      // Supabase insert failed → fall through to localStorage
      console.warn('[useCashStore.openRegister] Supabase insert failed, using localStorage');
    }

    // ── localStorage fallback ──
    const now = new Date().toISOString();
    const id = `session-${Date.now()}`;
    const session: CashSession = {
      id,
      openedBy,
      openedAt: now,
      initialBalance,
      expectedBalance: initialBalance,
      status: 'open'
    };
    const initMove: CashMovement = {
      id: `m-${Date.now()}`,
      sessionId: id,
      type: 'ingreso',
      amount: initialBalance,
      description: 'Fondo de apertura inicial',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const moves = initialBalance > 0 ? [initMove] : [];

    saveLocalSession(branchId, session);
    saveLocalMovements(id, moves);
    set({ currentSession: session, movements: moves, loading: false });
  },

  closeRegister: async (actualBalance, branchId) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({ loading: true });

    if (isSupabaseConfigured()) {
      await cashService.closeRegister(currentSession.id, actualBalance);
    }

    const difference = actualBalance - currentSession.expectedBalance;
    const closed: CashSession = {
      ...currentSession,
      closedAt: new Date().toISOString(),
      actualBalance,
      difference,
      status: 'closed'
    };

    clearLocalSession(branchId, currentSession.id);
    set({ currentSession: closed, loading: false });
  },

  addMovement: async (type, amount, description, branchId) => {
    const { currentSession, movements } = get();
    if (!currentSession) return;

    const factor = type === 'ingreso' ? 1 : -1;

    if (isSupabaseConfigured()) {
      await cashService.addMovement(currentSession.id, branchId, type, amount, description);
      // Reload from DB for accurate state
      const rawMoves = await cashService.getMovements(currentSession.id);
      const freshSession = await cashService.getCurrentSession(branchId);
      set({
        movements: mapMovements(rawMoves),
        currentSession: freshSession
          ? mapSession(freshSession)
          : { ...currentSession, expectedBalance: currentSession.expectedBalance + amount * factor }
      });
    } else {
      // localStorage
      const newMove: CashMovement = {
        id: `m-${Date.now()}`,
        sessionId: currentSession.id,
        type,
        amount,
        description,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const updatedMoves = [...movements, newMove];
      const updatedSession: CashSession = {
        ...currentSession,
        expectedBalance: currentSession.expectedBalance + amount * factor
      };
      saveLocalSession(branchId, updatedSession);
      saveLocalMovements(currentSession.id, updatedMoves);
      set({ movements: updatedMoves, currentSession: updatedSession });
    }
  }
}));
