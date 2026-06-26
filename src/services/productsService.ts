/**
 * productsService.ts
 * Service layer for Products / Menu catalog.
 */

import { supabase, isSupabaseConfigured, SupabaseProduct } from './supabase';

export const productsService = {
  /** Get all active products visible in POS (excludes insumos) */
  async getPOSCatalog(branchId?: string): Promise<SupabaseProduct[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .neq('type', 'insumo')
      .order('name');

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) { console.error('[productsService.getPOSCatalog]', error); return []; }
    return data as SupabaseProduct[];
  },

  /** Get all products (admin/inventory view) */
  async getAll(branchId?: string): Promise<SupabaseProduct[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .order('name');

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) { console.error('[productsService.getAll]', error); return []; }
    return data as SupabaseProduct[];
  },

  /** Public catalog for QR ordering (no auth required, uses anon key) */
  async getPublicMenu(branchId?: string): Promise<SupabaseProduct[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .neq('type', 'insumo')
      .order('name');

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) { console.error('[productsService.getPublicMenu]', error); return []; }
    return data as SupabaseProduct[];
  },

  async create(product: Omit<SupabaseProduct, 'id' | 'categories'>): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select('id')
      .single();

    if (error) { console.error('[productsService.create]', error); return null; }
    return data.id;
  },

  async adjustStock(productId: string, qty: number, type: 'entrada' | 'salida'): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // Use a Postgres RPC function for atomic stock update
    const { error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: productId,
      p_quantity: qty,
      p_type: type
    });

    if (error) {
      // Fallback: manual read-modify-write if RPC not yet created
      console.warn('[productsService.adjustStock] RPC not found, using fallback', error);
      const { data } = await supabase.from('products').select('current_stock').eq('id', productId).single();
      if (!data) return;
      const factor = type === 'entrada' ? 1 : -1;
      const newStock = Math.max(0, data.current_stock + qty * factor);
      await supabase.from('products').update({ current_stock: newStock }).eq('id', productId);
    }
  },

  async getCategories(branchId?: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) { console.error('[productsService.getCategories]', error); return []; }
    return data || [];
  },

  async createCategory(category: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('categories').insert(category);
    if (error) console.error('[productsService.createCategory]', error);
  },

  async createProduct(product: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('products').insert(product);
    if (error) console.error('[productsService.createProduct]', error);
  },

  async updateStock(productId: string, currentStock: number): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('products').update({ current_stock: currentStock }).eq('id', productId);
    if (error) console.error('[productsService.updateStock]', error);
  },

  async updateProduct(productId: string, product: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('products').update(product).eq('id', productId);
    if (error) console.error('[productsService.updateProduct]', error);
  },

  async deleteProduct(productId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) console.error('[productsService.deleteProduct]', error);
  }
};

