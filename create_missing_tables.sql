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

CREATE TABLE IF NOT EXISTS public.platform_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Allow all policies for fast demo setup (adjust later for security if needed)
CREATE POLICY "Allow all read on payment_alerts" ON public.payment_alerts FOR SELECT USING (true);
CREATE POLICY "Allow all insert on payment_alerts" ON public.payment_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on payment_alerts" ON public.payment_alerts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on payment_alerts" ON public.payment_alerts FOR DELETE USING (true);

CREATE POLICY "Allow all read on platform_config" ON public.platform_config FOR SELECT USING (true);
CREATE POLICY "Allow all insert on platform_config" ON public.platform_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on platform_config" ON public.platform_config FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on platform_config" ON public.platform_config FOR DELETE USING (true);
