-- ================================================================
-- RESTO POS - Esquema completo Multi-tenant / Multi-empresa
-- ================================================================
-- Ejecuta este script completo en el SQL Editor de Supabase
-- ================================================================

-- ── Extensiones ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLA: tenants (Empresas / Clientes del SaaS)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  subdomain   TEXT UNIQUE,
  plan_type   TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'standard', 'pro', 'premium', 'enterprise')),
  active      BOOLEAN DEFAULT true,
  qr_payment_image TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Inserción inicial de Empresa por Defecto
INSERT INTO public.tenants (id, name, subdomain, plan_type) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Restaurante Central', 'central', 'free')
  ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- TABLA: branches (Sucursales por Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.branches (id, tenant_id, name, address) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Sucursal Central', 'Av. Principal 123')
  ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- TABLA: profiles (Empleados vinculados a Empresa y Sucursal)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'mozo'
                CHECK (role IN ('super_admin','admin','cajero','mozo','cocina','delivery','supervisor')),
  branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: categories (Categorías de productos por Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  active      BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.categories (tenant_id, branch_id, name, slug, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '☕ Café & Cafetería', 'cafe', 1),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '🥤 Bebidas & Jugos', 'bebidas', 2),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '🥪 Desayunos & Meriendas', 'desayunos', 3),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '🍔 Almuerzos & Cenas', 'almuerzos', 4),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '🍰 Postres & Dulces', 'postres', 5),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '📦 Combos & Promos', 'combos', 6)
  ON CONFLICT DO NOTHING;

-- ================================================================
-- TABLA: products (Productos vinculados a Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  code            TEXT,
  sku             TEXT,
  type            TEXT NOT NULL DEFAULT 'producto'
                    CHECK (type IN ('producto','bebida','combo','promocion','insumo')),
  cost_price      NUMERIC(10,2) DEFAULT 0,
  sale_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) DEFAULT 21.0,
  image_url       TEXT,
  active          BOOLEAN DEFAULT true,
  stock_min       INT DEFAULT 5,
  stock_critical  INT DEFAULT 2,
  current_stock   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: restaurant_tables (Mesas vinculadas a Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  number      INT NOT NULL,
  zone        TEXT NOT NULL DEFAULT 'Salón Principal'
                CHECK (zone IN ('Salón Principal','Terraza','Planta Alta')),
  capacity    INT DEFAULT 4,
  status      TEXT NOT NULL DEFAULT 'libre'
                CHECK (status IN ('libre','ocupada','esperando_comida','comiendo','solicita_cuenta')),
  qr_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  current_order_id UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.restaurant_tables (tenant_id, branch_id, number, zone, capacity) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'Salón Principal', 2),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 2, 'Salón Principal', 4),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 3, 'Salón Principal', 4),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 4, 'Salón Principal', 6)
  ON CONFLICT DO NOTHING;

-- ================================================================
-- TABLA: orders (Pedidos vinculados a Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'pos'
                    CHECK (source IN ('pos','mesas','delivery','take_away')),
  status          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','preparando','listo','entregado','cancelado')),
  table_id        UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  table_name      TEXT,
  waiter_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  waiter_name     TEXT,
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_address TEXT,
  order_type      TEXT CHECK (order_type IN ('salon','llevar','delivery')),
  order_note      TEXT,
  subtotal        NUMERIC(10,2) DEFAULT 0,
  discount        NUMERIC(5,2) DEFAULT 0,
  tips            NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) DEFAULT 0,
  payment_method  TEXT,
  paid            BOOLEAN DEFAULT false,
  source_device   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: order_items
-- ================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  notes       TEXT,
  modifiers   TEXT[],
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: cash_sessions (Sesiones de caja vinculadas a Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  opened_by_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_by_name    TEXT,
  opened_at         TIMESTAMPTZ DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  initial_balance   NUMERIC(10,2) DEFAULT 0,
  expected_balance  NUMERIC(10,2) DEFAULT 0,
  actual_balance    NUMERIC(10,2),
  difference        NUMERIC(10,2),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed'))
);

-- ================================================================
-- TABLA: cash_movements
-- ================================================================
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('ingreso','egreso','retiro')),
  amount      NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: employees (Turno del personal vinculado a Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'mozo'
                    CHECK (role IN ('mozo','cocina','cajero','limpieza','otro')),
  assigned_tables UUID[],
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: shifts (Turnos por Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  opened_at         TIMESTAMPTZ DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  status            TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  active_staff_ids  UUID[],
  cash_session_id   UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL
);

-- ================================================================
-- TABLA: incidents (Incidencias por Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name   TEXT,
  type        TEXT NOT NULL CHECK (type IN ('incidente','reclamo','faltante','rotura','error_caja','error_cocina','error_sistema')),
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLA: audit_alerts (Alertas de auditoría por Empresa)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.audit_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  user_name   TEXT,
  type        TEXT NOT NULL CHECK (type IN ('rojo','amarillo','verde')),
  title       TEXT NOT NULL,
  amount      NUMERIC(10,2) DEFAULT 0,
  detail      TEXT,
  resolved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- REALTIME: Habilitar tablas para sincronización en tiempo real
-- ================================================================
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_tables REPLICA IDENTITY FULL;
ALTER TABLE public.cash_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.cash_movements REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- ================================================================
-- ROW LEVEL SECURITY (RLS) - Seguridad Aislada por Empresa (Tenant)
-- ================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts ENABLE ROW LEVEL SECURITY;

-- ── Políticas RLS por Tenant (Aislamiento de Datos) ──

-- Perfil propio y Tenant propio para lectura/escritura
CREATE POLICY tenant_isolation_profiles ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY tenant_isolation_branches ON public.branches
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_categories ON public.categories
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_products ON public.products
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_restaurant_tables ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_orders ON public.orders
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_order_items ON public.order_items
  FOR ALL TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY tenant_isolation_cash_sessions ON public.cash_sessions
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_cash_movements ON public.cash_movements
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_employees ON public.employees
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_shifts ON public.shifts
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_incidents ON public.incidents
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_audit_alerts ON public.audit_alerts
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ── Políticas Especiales para Clientes QR (Acceso Anon) ──
CREATE POLICY anon_read_products ON public.products
  FOR SELECT TO anon
  USING (active = true AND type != 'insumo');

CREATE POLICY anon_read_tables ON public.restaurant_tables
  FOR SELECT TO anon
  USING (true);

CREATE POLICY anon_insert_orders ON public.orders
  FOR INSERT TO anon
  WITH CHECK (source_device = 'customer_qr');

CREATE POLICY anon_insert_order_items ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (true);

-- ================================================================
-- FUNCIÓN: Registrar automáticamente perfil vinculado a Empresa
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_tenant_id UUID;
  default_branch_id UUID;
BEGIN
  -- Buscar o asignar el tenant default para nuevos registros
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  SELECT id INTO default_branch_id FROM public.branches WHERE tenant_id = default_tenant_id LIMIT 1;

  INSERT INTO public.profiles (id, tenant_id, name, email, role, branch_id)
  VALUES (
    NEW.id,
    default_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'mozo'),
    default_branch_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ================================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ================================================================
-- SUPER ADMIN SETUP
-- ================================================================
-- Tenant especial de la plataforma (no es una empresa cliente)
INSERT INTO public.tenants (id, name, subdomain, plan_type, active)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'RESTO POS Platform',
  'platform',
  'enterprise',
  true
) ON CONFLICT (id) DO NOTHING;

-- Sucursal de la plataforma
INSERT INTO public.branches (id, tenant_id, name, address)
VALUES (
  'f0000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'Plataforma Central',
  'Buenos Aires, Argentina'
) ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- PASO MANUAL REQUERIDO:
-- 1. Crear el usuario en Supabase Authentication:
--    Email: horaciowalterortiz@gmail.com
--    Contraseña: la que prefieras
--
-- 2. Luego de crearlo, copiar el UUID del usuario y ejecutar:
--    (Reemplazar <UUID_DEL_USUARIO> con el UUID real)
-- ================================================================

-- INSERT INTO public.profiles (id, tenant_id, name, email, role, branch_id, active)
-- VALUES (
--   '<UUID_DEL_USUARIO>',
--   'f0000000-0000-0000-0000-000000000001',
--   'Horacio Ortiz',
--   'horaciowalterortiz@gmail.com',
--   'super_admin',
--   'f0000000-0000-0000-0000-000000000002',
--   true
-- ) ON CONFLICT (id) DO UPDATE SET
--   role = 'super_admin',
--   tenant_id = 'f0000000-0000-0000-0000-000000000001',
--   active = true;

-- ================================================================
-- ALTERNATIVA: Si el usuario YA EXISTE en auth.users, ejecutar:
-- UPDATE public.profiles
--   SET role = 'super_admin',
--       tenant_id = 'f0000000-0000-0000-0000-000000000001',
--       branch_id = 'f0000000-0000-0000-0000-000000000002'
-- WHERE email = 'horaciowalterortiz@gmail.com';
-- ================================================================

-- RLS: Permitir al super_admin leer y modificar todos los tenants
CREATE POLICY "super_admin_all_tenants"
  ON public.tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );


-- ================================================================
-- TABLA: payment_alerts (Avisos de pago de los tenants)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payment_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name   TEXT NOT NULL,
  sender_name   TEXT NOT NULL,
  plan_type     TEXT NOT NULL CHECK (plan_type IN ('standard', 'pro')),
  amount        NUMERIC NOT NULL,
  notes         TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS para payment_alerts
ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

-- El tenant solo puede insertar sus propias alertas
CREATE POLICY "tenant_insert_own_alert"
  ON public.payment_alerts FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- El tenant puede ver sus propias alertas
CREATE POLICY "tenant_read_own_alerts"
  ON public.payment_alerts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Solo super_admin puede actualizar (confirmar / rechazar)
CREATE POLICY "superadmin_update_alerts"
  ON public.payment_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ================================================================
-- TABLA: platform_config (Configuración global de la plataforma)
-- Almacena: precios de planes, CBU, link MP, etc.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.platform_config (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para platform_config
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer (necesitan ver el CBU/MP para pagar)
CREATE POLICY "authenticated_read_config"
  ON public.platform_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo super_admin puede insertar o actualizar
CREATE POLICY "superadmin_write_config"
  ON public.platform_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Valores por defecto
INSERT INTO public.platform_config (key, value) VALUES
  ('price_standard_monthly', '28100'),
  ('price_standard_annual',  '252900'),
  ('price_pro_monthly',      '44900'),
  ('price_pro_annual',       '404100'),
  ('payment_cbu',            ''),
  ('payment_alias',          ''),
  ('payment_mp_link',        ''),
  ('payment_holder_name',    '')
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- TABLA: cash_sessions (Sesiones / Turnos de Caja)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id         UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  opened_by_id      UUID,
  opened_by_name    TEXT NOT NULL,
  opened_at         TIMESTAMPTZ DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  initial_balance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_balance    NUMERIC(12,2),
  difference        NUMERIC(12,2),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_cash_sessions_select"
  ON public.cash_sessions FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "branch_cash_sessions_insert"
  ON public.cash_sessions FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "branch_cash_sessions_update"
  ON public.cash_sessions FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ================================================================
-- TABLA: cash_movements (Movimientos dentro de una sesión de caja)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso', 'retiro')),
  amount       NUMERIC(12,2) NOT NULL,
  description  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_cash_movements_select"
  ON public.cash_movements FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "branch_cash_movements_insert"
  ON public.cash_movements FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );
