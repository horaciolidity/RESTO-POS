-- ==============================================================================
-- CORRECCIÓN DE POLÍTICAS RLS — ÓRDENES Y PERMISOS DELIVERY
-- ==============================================================================

-- 1. Eliminar política restrictiva anterior si existiera
DROP POLICY IF EXISTS "orders_update_all" ON public.orders;

-- 2. Crear una política permisiva para permitir que los repartidores (sesiones anónimas o autenticadas) 
-- puedan actualizar el estado del pedido (tomarlo, marcarlo como entregado)
CREATE POLICY "orders_update_all" ON public.orders
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- 3. Asegurarse que se pueda hacer SELECT
DROP POLICY IF EXISTS "orders_select_all" ON public.orders;
CREATE POLICY "orders_select_all" ON public.orders
  FOR SELECT TO authenticated, anon USING (true);
