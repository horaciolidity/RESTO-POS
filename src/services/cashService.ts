/**
 * cashService.ts
 * Service layer for Cash Sessions and Movements.
 * All writes go to Supabase so state persists across page refreshes.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export type SupabaseCashSession = {
  id: string;
  branch_id: string;
  opened_by_id?: string;
  opened_by_name: string;
  opened_at: string;
  closed_at?: string;
  initial_balance: number;
  expected_balance: number;
  actual_balance?: number;
  difference?: number;
  status: 'open' | 'closed';
};

export type SupabaseCashMovement = {
  id: string;
  session_id: string;
  branch_id: string;
  type: 'ingreso' | 'egreso' | 'retiro';
  amount: number;
  description: string;
  created_at: string;
};

export const cashService = {
  /**
   * Fetch the current open session for a branch.
   * Returns null if no session is open.
   */
  async getCurrentSession(branchId?: string): Promise<SupabaseCashSession | null> {
    if (!isSupabaseConfigured()) return null;

    let query = supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1);

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) {
      console.error('[cashService.getCurrentSession]', error);
      return null;
    }
    return (data?.[0] as SupabaseCashSession) || null;
  },

  /**
   * Open a new cash register session.
   * Returns the new session ID on success, null on failure.
   */
  async openRegister(
    openedByName: string,
    openedById: string,
    initialBalance: number,
    branchId: string,
    tenantId: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({
        tenant_id: tenantId,
        branch_id: branchId,
        opened_by_id: openedById || undefined,
        opened_by_name: openedByName,
        initial_balance: initialBalance,
        expected_balance: initialBalance,
        status: 'open'
      })
      .select('id')
      .single();

    if (error) {
      console.error('[cashService.openRegister]', error);
      return null;
    }

    // Record the opening movement
    if (initialBalance > 0) {
      await cashService.addMovement(
        data.id,
        branchId,
        'ingreso',
        initialBalance,
        'Fondo de apertura inicial'
      );
    }

    return data.id;
  },

  /**
   * Close the current cash session with an actual counted balance.
   */
  async closeRegister(sessionId: string, actualBalance: number): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // Fetch current expected_balance to compute difference
    const { data: sessionData } = await supabase
      .from('cash_sessions')
      .select('expected_balance')
      .eq('id', sessionId)
      .single();

    const difference = actualBalance - Number(sessionData?.expected_balance || 0);

    const { error } = await supabase
      .from('cash_sessions')
      .update({
        closed_at: new Date().toISOString(),
        actual_balance: actualBalance,
        difference,
        status: 'closed'
      })
      .eq('id', sessionId);

    if (error) console.error('[cashService.closeRegister]', error);
  },

  /**
   * Record a cash movement (income, expense, or withdrawal).
   * Updates the session's expected_balance directly via UPDATE.
   */
  async addMovement(
    sessionId: string,
    branchId: string,
    type: 'ingreso' | 'egreso' | 'retiro',
    amount: number,
    description: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // 1. Insert the movement record
    const { error: moveError } = await supabase.from('cash_movements').insert({
      session_id: sessionId,
      branch_id: branchId,
      type,
      amount,
      description
    });

    if (moveError) {
      console.error('[cashService.addMovement] insert movement', moveError);
      return;
    }

    // 2. Update expected_balance in the session directly
    // We fetch current and compute new value (no RPC needed)
    const { data: sess } = await supabase
      .from('cash_sessions')
      .select('expected_balance')
      .eq('id', sessionId)
      .single();

    if (sess) {
      const factor = type === 'ingreso' ? 1 : -1;
      const newBalance = Number(sess.expected_balance) + amount * factor;
      await supabase
        .from('cash_sessions')
        .update({ expected_balance: newBalance })
        .eq('id', sessionId);
    }
  },

  /**
   * Fetch all movements for a session, ordered oldest first.
   */
  async getMovements(sessionId: string): Promise<SupabaseCashMovement[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[cashService.getMovements]', error);
      return [];
    }
    return data as SupabaseCashMovement[];
  }
};
