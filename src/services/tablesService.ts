/**
 * tablesService.ts
 * Service layer for Restaurant Tables with real-time sync.
 */

import { supabase, isSupabaseConfigured, SupabaseTable } from './supabase';

let tablesSubscription: any = null;

export const tablesService = {
  async getAll(branchId?: string): Promise<SupabaseTable[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('restaurant_tables')
      .select('*')
      .order('number', { ascending: true });

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) { console.error('[tablesService.getAll]', error); return []; }
    return data as SupabaseTable[];
  },

  async getByQrToken(token: string): Promise<SupabaseTable | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('qr_token', token)
      .single();

    if (error) { console.error('[tablesService.getByQrToken]', error); return null; }
    return data as SupabaseTable;
  },

  async updateStatus(tableId: string, status: SupabaseTable['status'], currentOrderId?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status, current_order_id: currentOrderId || null })
      .eq('id', tableId);

    if (error) console.error('[tablesService.updateStatus]', error);
  },

  async create(table: Omit<SupabaseTable, 'id' | 'qr_token' | 'status'>): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('restaurant_tables').insert(table);
    if (error) console.error('[tablesService.create]', error);
  },

  async remove(tableId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', tableId);
    if (error) console.error('[tablesService.remove]', error);
  },

  subscribeToTables(onUpdate: (tables: SupabaseTable[]) => void, branchId?: string) {
    if (!isSupabaseConfigured()) return;

    // Unique channel name to avoid conflicts with multiple subscribers
    const channelName = `tables-realtime-${branchId || 'all'}-${Date.now()}`;

    tablesSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, async () => {
        const updated = await tablesService.getAll(branchId);
        onUpdate(updated);
      })
      .subscribe();
  },

  unsubscribeFromTables() {
    if (tablesSubscription) { supabase.removeChannel(tablesSubscription); tablesSubscription = null; }
  }
};
