-- ================================================================
-- RESTO POS - Update para panel Super Admin: Suscripciones y Promociones
-- ================================================================
-- Ejecutar en SQL Editor de Supabase
-- ================================================================

-- 1. Añadir campos a la tabla tenants
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS subscription_start DATE,
  ADD COLUMN IF NOT EXISTS subscription_end DATE,
  ADD COLUMN IF NOT EXISTS months_paid INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_months INTEGER DEFAULT 0;

-- 2. Tabla de promociones
CREATE TABLE IF NOT EXISTS public.payment_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_months INTEGER NOT NULL DEFAULT 10,   -- pagar N meses consecutivos
  bonus_months INTEGER NOT NULL DEFAULT 2,       -- regala X meses
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Insertar promo por defecto
INSERT INTO public.payment_promotions (name, description, trigger_months, bonus_months) 
VALUES ('Fidelidad 10+2', 'Pagá 10 meses consecutivos y te regalamos 2 meses gratis', 10, 2)
ON CONFLICT DO NOTHING;
