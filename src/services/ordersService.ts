/**
 * ordersService.ts
 * ─────────────────────────────────────────────────────────────────
 * Service layer for Orders. Abstracts the data source so the app
 * works with local Zustand data in demo mode and switches to
 * Supabase automatically when credentials are configured.
 *
 * Usage in components:
 *   import { ordersService } from '../../services/ordersService';
 *   const orders = await ordersService.getAll();
 */

import { supabase, isSupabaseConfigured, SupabaseOrder, SupabaseOrderItem } from './supabase';

// ── Real-time subscription handle ────────────────────────────────
let ordersSubscription: any = null;

export const ordersService = {
  /**
   * Fetch all orders for a branch, newest first.
   * Includes order_items in the same query.
   */
  async getAll(branchId?: string): Promise<SupabaseOrder[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('orders')
      .select(`*, order_items(*)`)
      .order('created_at', { ascending: false });

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) { console.error('[ordersService.getAll]', error); return []; }
    return data as SupabaseOrder[];
  },

  /** Fetch a single order by ID */
  async getById(orderId: string): Promise<SupabaseOrder | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items(*)`)
      .eq('id', orderId)
      .single();

    if (error) { console.error('[ordersService.getById]', error); return null; }
    return data as SupabaseOrder;
  },

  /**
   * Create a new order with its items (transaction-style).
   * Returns the created order ID or null on failure.
   */
  async create(
    order: Omit<SupabaseOrder, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<SupabaseOrderItem, 'id' | 'order_id' | 'created_at'>[]
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const orderNumber = String(Math.floor(Math.random() * 9000) + 1000);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({ ...order, order_number: orderNumber })
      .select('id')
      .single();

    if (orderError) { console.error('[ordersService.create] order', orderError); return null; }

    const orderId = orderData.id;

    const itemsToInsert = items.map(item => ({ ...item, order_id: orderId }));
    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

    if (itemsError) { console.error('[ordersService.create] items', itemsError); }

    return orderId;
  },

  async updateStatus(orderId: string, status: SupabaseOrder['status']): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) console.error('[ordersService.updateStatus]', error);
  },

  async closeOrder(orderId: string, paymentMethod?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('orders')
      .update({ paid: true, status: 'entregado', payment_method: paymentMethod || 'Efectivo' })
      .eq('id', orderId);

    if (error) console.error('[ordersService.closeOrder]', error);
  },

  /**
   * Subscribe to real-time order changes.
   * Fires onUpdate(orders[]) whenever an order or its items change.
   */
  subscribeToOrders(onUpdate: (orders: SupabaseOrder[]) => void, branchId?: string) {
    if (!isSupabaseConfigured()) return;

    ordersSubscription = supabase
      .channel('orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        ...(branchId ? { filter: `branch_id=eq.${branchId}` } : {})
      }, async () => {
        // Re-fetch all orders on any change so UI stays in sync
        const updated = await ordersService.getAll(branchId);
        onUpdate(updated);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items'
      }, async () => {
        // Also re-fetch when order items change (e.g. waiter adds items)
        const updated = await ordersService.getAll(branchId);
        onUpdate(updated);
      })
      .subscribe();
  },

  unsubscribeFromOrders() {
    if (ordersSubscription) {
      supabase.removeChannel(ordersSubscription);
      ordersSubscription = null;
    }
  }
};
