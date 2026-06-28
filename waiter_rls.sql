-- ==============================================================================
-- ACTUALIZACIÓN DE POLÍTICAS RLS PARA ACCESO ANÓNIMO DE MOZOS
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Permitir que los usuarios anónimos (mozos con enlace) lean los empleados
CREATE POLICY anon_read_employees ON public.employees
  FOR SELECT TO anon
  USING (active = true);

-- 2. Modificar políticas de orders para permitir que los mozos operen de forma anónima
-- Permitimos SELECT para que puedan ver comandas (ya filtran por su nombre en el frontend)
CREATE POLICY anon_select_orders ON public.orders
  FOR SELECT TO anon
  USING (true);

-- Permitimos UPDATE a anon para que puedan actualizar el estado de los pedidos (ej. entregado)
CREATE POLICY anon_update_orders ON public.orders
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 3. Modificar políticas de order_items para permitir actualizarlos
CREATE POLICY anon_select_order_items ON public.order_items
  FOR SELECT TO anon
  USING (true);

CREATE POLICY anon_update_order_items ON public.order_items
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 4. Modificar políticas de restaurant_tables para permitir actualizarlas (ocupar/liberar)
CREATE POLICY anon_update_tables ON public.restaurant_tables
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Permitir que los mozos agreguen incidentes/novedades (INSERT en incidents)
CREATE POLICY anon_insert_incidents ON public.incidents
  FOR INSERT TO anon
  WITH CHECK (true);

-- 6. Permitir que los mozos con enlace directo lean las sesiones de caja (SELECT en cash_sessions)
CREATE POLICY anon_select_cash_sessions ON public.cash_sessions
  FOR SELECT TO anon
  USING (true);

-- 7. Permitir a los mozos anónimos agregar nuevos pedidos (INSERT en orders)
CREATE POLICY anon_insert_orders ON public.orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- 8. Permitir a los mozos anónimos agregar nuevos productos al pedido (INSERT en order_items)
CREATE POLICY anon_insert_order_items ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (true);

-- NOTA: Estas reglas asumen que el ID de la empresa (tenant_id) y la sucursal
-- se inyectan y validan desde la aplicación en el lado del cliente y que nadie
-- conoce el enlace de los mozos excepto ellos mismos y el administrador.
