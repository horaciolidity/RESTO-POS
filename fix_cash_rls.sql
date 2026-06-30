-- ==============================================================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA CAJA Y MOVIMIENTOS (CASH SESSIONS & MOVEMENTS)
-- Ejecuta este script completo en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Deshabilitar RLS temporalmente o recrear políticas permisivas para evitar bloqueos
-- Dropear políticas previas restrictivas si existen
DROP POLICY IF EXISTS "cash_sessions_select" ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_insert" ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_update" ON public.cash_sessions;
DROP POLICY IF EXISTS "anon_select_cash_sessions" ON public.cash_sessions;

DROP POLICY IF EXISTS "cash_movements_select" ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_insert" ON public.cash_movements;

-- 2. Crear políticas permisivas para cash_sessions (tanto para autenticados como para mozos/anon)
CREATE POLICY "cash_sessions_select_all" ON public.cash_sessions
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "cash_sessions_insert_all" ON public.cash_sessions
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "cash_sessions_update_all" ON public.cash_sessions
  FOR UPDATE TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 3. Crear políticas permisivas para cash_movements (para poder registrar ventas y movimientos)
CREATE POLICY "cash_movements_select_all" ON public.cash_movements
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "cash_movements_insert_all" ON public.cash_movements
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- 4. Opcional: También dar permisos para borrar si es necesario en desarrollo
CREATE POLICY "cash_movements_delete_all" ON public.cash_movements
  FOR DELETE TO authenticated, anon
  USING (true);
