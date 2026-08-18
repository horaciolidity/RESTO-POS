-- ================================================================
-- RESTO POS - Update para módulo de Delivery
-- ================================================================

-- 1. Actualizar el CHECK constraint del rol en employees para permitir 'delivery'
-- Primero quitamos el viejo
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
-- Luego agregamos el nuevo
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check 
  CHECK (role IN ('mozo','cocina','cajero','limpieza','otro','delivery'));

-- 2. Añadir columnas a la tabla orders para tracking de delivery
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivery_driver_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'on_route', 'delivered')),
  ADD COLUMN IF NOT EXISTS customer_location JSONB; -- Para guardar lat, lng o info adicional
