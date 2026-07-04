-- ==============================================================================
-- CORRECCIÓN DE POLÍTICAS RLS — CAJA (CASH SESSIONS & MOVEMENTS)
-- Seguro para re-ejecutar: limpia todas las políticas antes de crearlas de nuevo
-- ==============================================================================

-- ── PASO 1: Eliminar TODAS las políticas de cash_sessions (antiguas y nuevas) ──
DROP POLICY IF EXISTS "cash_sessions_select"      ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_insert"      ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_update"      ON public.cash_sessions;
DROP POLICY IF EXISTS "anon_select_cash_sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_select_all"  ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_insert_all"  ON public.cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_update_all"  ON public.cash_sessions;

-- ── PASO 2: Eliminar TODAS las políticas de cash_movements (antiguas y nuevas) ──
DROP POLICY IF EXISTS "cash_movements_select"      ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_insert"      ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_select_all"  ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_insert_all"  ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_delete_all"  ON public.cash_movements;

-- ── PASO 3: Crear políticas permisivas para cash_sessions ──
CREATE POLICY "cash_sessions_select_all" ON public.cash_sessions
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "cash_sessions_insert_all" ON public.cash_sessions
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "cash_sessions_update_all" ON public.cash_sessions
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- ── PASO 4: Crear políticas permisivas para cash_movements ──
CREATE POLICY "cash_movements_select_all" ON public.cash_movements
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "cash_movements_insert_all" ON public.cash_movements
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "cash_movements_delete_all" ON public.cash_movements
  FOR DELETE TO authenticated, anon USING (true);
