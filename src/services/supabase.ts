import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;


/**
 * Returns true only when both env vars are set AND are real values
 * (not the placeholder strings from .env.example)
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://XXXXXXXXXXXXXXXX.supabase.co' &&
    !supabaseAnonKey.includes('TU_ANON_KEY_AQUI')
  );
};

// Use a fallback so the app doesn't crash in offline/demo mode
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// ── Type helpers ──────────────────────────────────────────────────────────────

export type SupabaseOrder = {
  id: string;
  branch_id: string;
  order_number: string;
  source: 'pos' | 'mesas' | 'delivery' | 'take_away';
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  table_id?: string;
  table_name?: string;
  waiter_id?: string;
  waiter_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  order_type?: 'salon' | 'llevar' | 'delivery';
  order_note?: string;
  subtotal: number;
  discount: number;
  tips: number;
  total: number;
  payment_method?: string;
  paid: boolean;
  source_device?: string;
  created_at: string;
  updated_at: string;
  order_items?: SupabaseOrderItem[];
};

export type SupabaseOrderItem = {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  modifiers?: string[];
};

export type SupabaseTable = {
  id: string;
  branch_id: string;
  number: number;
  zone: 'Salón Principal' | 'Terraza' | 'Planta Alta';
  capacity: number;
  status: 'libre' | 'ocupada' | 'esperando_comida' | 'comiendo' | 'solicita_cuenta';
  qr_token: string;
  current_order_id?: string;
};

export type SupabaseProduct = {
  id: string;
  branch_id: string;
  category_id: string;
  name: string;
  description?: string;
  code?: string;
  sku?: string;
  type: 'producto' | 'bebida' | 'combo' | 'promocion' | 'insumo';
  cost_price: number;
  sale_price: number;
  tax_rate: number;
  image_url?: string;
  active: boolean;
  stock_min: number;
  stock_critical: number;
  current_stock: number;
  categories?: { name: string };
};

export type SupabaseProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string;
  active: boolean;
};
