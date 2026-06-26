import { supabase } from './supabase';

export interface DBEmployee {
  id: string;
  tenant_id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  role: 'mozo' | 'cocina' | 'cajero' | 'limpieza' | 'otro';
  assigned_tables: string[];
  active: boolean;
  created_at: string;
}

export const employeesService = {
  async getAll(tenantId: string, branchId?: string): Promise<DBEmployee[]> {
    let query = supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[employeesService.getAll]', error);
      return [];
    }
    return data as DBEmployee[];
  },

  async create(employee: Omit<DBEmployee, 'id' | 'created_at' | 'active'>): Promise<DBEmployee | null> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        tenant_id: employee.tenant_id,
        branch_id: employee.branch_id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role,
        assigned_tables: employee.assigned_tables || [],
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('[employeesService.create]', error);
      return null;
    }
    return data as DBEmployee;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[employeesService.remove]', error);
      return false;
    }
    return true;
  },

  async update(id: string, updates: Partial<DBEmployee>): Promise<boolean> {
    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[employeesService.update]', error);
      return false;
    }
    return true;
  }
};
