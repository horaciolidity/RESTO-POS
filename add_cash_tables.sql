-- ================================================================
-- RESTO POS — Tablas de Caja (cash_sessions + cash_movements)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ================================================================

-- ── Tabla: cash_sessions ─────────────────────────────────────────
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
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- Cada usuario sólo ve las sesiones de su propia sucursal
CREATE POLICY "cash_sessions_select"
  ON public.cash_sessions FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "cash_sessions_insert"
  ON public.cash_sessions FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "cash_sessions_update"
  ON public.cash_sessions FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── Tabla: cash_movements ────────────────────────────────────────
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

CREATE POLICY "cash_movements_select"
  ON public.cash_movements FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "cash_movements_insert"
  ON public.cash_movements FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );
