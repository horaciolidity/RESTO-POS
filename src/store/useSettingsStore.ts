import { create } from 'zustand';
import { employeesService } from '../services/employeesService';
import { useAuthStore } from './useAuthStore';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: 'mozo' | 'cocina' | 'limpieza' | 'cajero' | 'otro';
  assignedTables?: string[]; // Array of table IDs assigned to this employee (mainly for waiters)
}

export interface ShiftSettings {
  isOpen: boolean;
  openedAt: string | null;
  activeStaffIds: string[];
}

interface SettingsState {
  businessName: string;
  employees: Employee[];
  shift: ShiftSettings;
  loading: boolean;

  // Initializer
  initializeStore: () => Promise<void>;

  // Business config
  setBusinessName: (name: string) => void;

  // Employee Management
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  assignTableToWaiter: (waiterId: string, tableId: string) => Promise<void>;
  unassignTableFromWaiter: (waiterId: string, tableId: string) => Promise<void>;

  // Shift Management
  openShift: (staffIds: string[]) => void;
  closeShift: () => void;
  updateActiveStaff: (staffIds: string[]) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  businessName: 'Mi Restaurante',
  employees: [],
  loading: false,
  shift: {
    isOpen: false,
    openedAt: null,
    activeStaffIds: [],
  },

  initializeStore: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.tenantId) return;
    set({ loading: true });
    const fetched = await employeesService.getAll(user.tenantId, user.branchId);
    set({
      employees: fetched.map(e => ({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        role: e.role,
        assignedTables: e.assigned_tables || []
      })),
      loading: false
    });
  },

  setBusinessName: (name) => set(() => ({ businessName: name })),

  addEmployee: async (emp) => {
    const user = useAuthStore.getState().user;
    if (!user?.tenantId) return;
    
    await employeesService.create({
      tenant_id: user.tenantId,
      branch_id: user.branchId || '',
      first_name: emp.firstName,
      last_name: emp.lastName,
      role: emp.role,
      assigned_tables: emp.assignedTables || []
    });

    // Refresh immediately
    await get().initializeStore();
  },

  updateEmployee: async (id, updatedFields) => {
    const dbUpdates: any = {};
    if (updatedFields.firstName) dbUpdates.first_name = updatedFields.firstName;
    if (updatedFields.lastName) dbUpdates.last_name = updatedFields.lastName;
    if (updatedFields.role) dbUpdates.role = updatedFields.role;
    if (updatedFields.assignedTables) dbUpdates.assigned_tables = updatedFields.assignedTables;

    await employeesService.update(id, dbUpdates);
    await get().initializeStore();
  },

  removeEmployee: async (id) => {
    await employeesService.remove(id);
    await get().initializeStore();
    set((state) => ({
      shift: {
        ...state.shift,
        activeStaffIds: state.shift.activeStaffIds.filter(staffId => staffId !== id)
      }
    }));
  },

  assignTableToWaiter: async (waiterId, tableId) => {
    const waiter = get().employees.find(e => e.id === waiterId);
    if (!waiter) return;
    const currentTables = waiter.assignedTables || [];
    if (!currentTables.includes(tableId)) {
      const updatedTables = [...currentTables, tableId];
      await employeesService.update(waiterId, { assigned_tables: updatedTables });
      await get().initializeStore();
    }
  },

  unassignTableFromWaiter: async (waiterId, tableId) => {
    const waiter = get().employees.find(e => e.id === waiterId);
    if (!waiter || !waiter.assignedTables) return;
    const updatedTables = waiter.assignedTables.filter(t => t !== tableId);
    await employeesService.update(waiterId, { assigned_tables: updatedTables });
    await get().initializeStore();
  },

  openShift: (staffIds) => set(() => ({
    shift: {
      isOpen: true,
      openedAt: new Date().toISOString(),
      activeStaffIds: staffIds
    }
  })),

  closeShift: () => set(() => ({
    shift: {
      isOpen: false,
      openedAt: null,
      activeStaffIds: []
    }
  })),

  updateActiveStaff: (staffIds) => set((state) => ({
    shift: {
      ...state.shift,
      activeStaffIds: staffIds
    }
  }))
}));

// Initialize store when auth state is resolved or user is loaded
useAuthStore.subscribe((state) => {
  if (state.user?.tenantId) {
    useSettingsStore.getState().initializeStore();
  }
});
