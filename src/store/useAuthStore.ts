import { create } from 'zustand';
import { authService } from '../services/authService';

export type UserRole = 'super_admin' | 'admin' | 'cajero' | 'mozo' | 'cocina' | 'delivery' | 'supervisor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  tenantId?: string;
  tenantName?: string;
  planType?: 'free' | 'standard' | 'pro' | 'premium' | 'enterprise';
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  login: (role: UserRole, email?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set: any, get: any) => ({
  user: null,
  loading: true,

  login: async (_role: UserRole, email?: string, password?: string) => {
    set({ loading: true });
    try {
      const profile = await authService.login(email || '', password || '');
      if (profile) {
        set({ user: profile, loading: false });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err) {
      console.error('[useAuthStore.login]', err);
      set({ loading: false });
      return false;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await authService.logout();
    } catch (err) {
      console.error('[useAuthStore.logout]', err);
    }
    sessionStorage.removeItem('simulated_mozo');
    set({ user: null, loading: false });
  },

  hasPermission: (allowedRoles: UserRole[]) => {
    const currentUser = get().user;
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    return allowedRoles.includes(currentUser.role);
  },

  initialize: async () => {
    set({ loading: true });
    try {
      const activeUser = await authService.restoreSession();
      if (!activeUser && sessionStorage.getItem('simulated_mozo')) {
        set({ user: JSON.parse(sessionStorage.getItem('simulated_mozo')!), loading: false });
      } else {
        set({ user: activeUser, loading: false });
      }

      authService.onAuthStateChange((profile) => {
        if (!profile && sessionStorage.getItem('simulated_mozo')) {
          set({ user: JSON.parse(sessionStorage.getItem('simulated_mozo')!) });
        } else {
          set({ user: profile });
        }
      });
    } catch (err) {
      console.error('[useAuthStore.initialize]', err);
      set({ loading: false });
    }
  }
}));

// Auto-initialize on load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}
