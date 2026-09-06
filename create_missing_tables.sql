-- ============================================================
-- Crea las tablas faltantes y otorga permisos de acceso
-- Ejecutar completo en Supabase SQL Editor
-- ============================================================

-- 1. Crear tabla payment_alerts
CREATE TABLE IF NOT EXISTS public.payment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    branch_id UUID,
    title TEXT,
    message TEXT,
    amount NUMERIC,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla platform_config
CREATE TABLE IF NOT EXISTS public.platform_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Activar Row Level Security
ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas previas si existen (para evitar error "already exists")
DROP POLICY IF EXISTS "Allow all read on payment_alerts" ON public.payment_alerts;
DROP POLICY IF EXISTS "Allow all insert on payment_alerts" ON public.payment_alerts;
DROP POLICY IF EXISTS "Allow all update on payment_alerts" ON public.payment_alerts;
DROP POLICY IF EXISTS "Allow all delete on payment_alerts" ON public.payment_alerts;

DROP POLICY IF EXISTS "Allow all read on platform_config" ON public.platform_config;
DROP POLICY IF EXISTS "Allow all insert on platform_config" ON public.platform_config;
DROP POLICY IF EXISTS "Allow all update on platform_config" ON public.platform_config;
DROP POLICY IF EXISTS "Allow all delete on platform_config" ON public.platform_config;

-- 5. Crear políticas de acceso
CREATE POLICY "Allow all read on payment_alerts"   ON public.payment_alerts FOR SELECT USING (true);
CREATE POLICY "Allow all insert on payment_alerts" ON public.payment_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on payment_alerts" ON public.payment_alerts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on payment_alerts" ON public.payment_alerts FOR DELETE USING (true);

CREATE POLICY "Allow all read on platform_config"   ON public.platform_config FOR SELECT USING (true);
CREATE POLICY "Allow all insert on platform_config" ON public.platform_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on platform_config" ON public.platform_config FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on platform_config" ON public.platform_config FOR DELETE USING (true);

-- 6. Otorgar permisos de acceso a los roles del cliente web
GRANT ALL ON TABLE public.payment_alerts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.platform_config TO anon, authenticated, service_role;
