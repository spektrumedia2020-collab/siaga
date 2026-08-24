-- ============================================================================
-- SIAGA — 003_rls_policies.sql
-- RLS policy + trigger + function (item audit 3.13)
-- ============================================================================
-- Konsolidasi dari: create_officers_table.sql, create_attendance_table.sql,
-- create_setoran_table.sql, create_market_config_table.sql,
-- create_announcements_table.sql, fix_transactions_insert_rls.sql
--
-- Semua idempoten (DROP IF EXISTS / CREATE OR REPLACE) — aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. officers — RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "officers_select_own" ON public.officers;
CREATE POLICY "officers_select_own"
ON public.officers FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "officers_insert_own" ON public.officers;
CREATE POLICY "officers_insert_own"
ON public.officers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "officers_update_own" ON public.officers;
CREATE POLICY "officers_update_own"
ON public.officers FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "officers_select_auth" ON public.officers;
CREATE POLICY "officers_select_auth"
ON public.officers FOR SELECT TO authenticated
USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_officers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_officers_timestamp ON public.officers;
CREATE TRIGGER update_officers_timestamp
BEFORE UPDATE ON public.officers
FOR EACH ROW EXECUTE FUNCTION public.update_officers_timestamp();

-- ---------------------------------------------------------------------------
-- 2. attendance — RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_officer_select" ON public.attendance;
CREATE POLICY "attendance_officer_select"
ON public.attendance FOR SELECT TO authenticated
USING (officer_id = auth.uid());

DROP POLICY IF EXISTS "attendance_officer_insert" ON public.attendance;
CREATE POLICY "attendance_officer_insert"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (officer_id = auth.uid());

DROP POLICY IF EXISTS "attendance_officer_update" ON public.attendance;
CREATE POLICY "attendance_officer_update"
ON public.attendance FOR UPDATE TO authenticated
USING (officer_id = auth.uid()) WITH CHECK (officer_id = auth.uid());

DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select"
ON public.attendance FOR SELECT TO authenticated
USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_attendance_timestamp ON public.attendance;
CREATE TRIGGER update_attendance_timestamp
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.update_attendance_timestamp();

-- ---------------------------------------------------------------------------
-- 3. setoran — RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.setoran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "setoran_officer_select" ON public.setoran;
CREATE POLICY "setoran_officer_select" ON public.setoran
  FOR SELECT TO authenticated
  USING (
    officer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
      AND r.name IN ('TREASURER', 'MARKET_HEAD', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "setoran_officer_insert" ON public.setoran;
CREATE POLICY "setoran_officer_insert" ON public.setoran
  FOR INSERT TO authenticated
  WITH CHECK (officer_id = auth.uid());

DROP POLICY IF EXISTS "setoran_approval_update" ON public.setoran;
CREATE POLICY "setoran_approval_update" ON public.setoran
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
      AND r.name IN ('TREASURER', 'MARKET_HEAD', 'ADMIN')
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_setoran_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_setoran_timestamp ON public.setoran;
CREATE TRIGGER update_setoran_timestamp
BEFORE UPDATE ON public.setoran
FOR EACH ROW EXECUTE FUNCTION public.update_setoran_timestamp();

-- ---------------------------------------------------------------------------
-- 4. market_config — RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.market_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read market_config" ON public.market_config;
CREATE POLICY "Authenticated users can read market_config"
  ON public.market_config FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Market officers can update their market config" ON public.market_config;
CREATE POLICY "Market officers can update their market config"
  ON public.market_config FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
        AND u.market_id = market_config.market_id
        AND r.name IN ('ADMIN', 'MARKET_HEAD', 'TREASURER')
    )
  );

-- ---------------------------------------------------------------------------
-- 5. announcements — RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read announcements" ON public.announcements;
CREATE POLICY "Authenticated users can read announcements"
  ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Market officers can manage their announcements" ON public.announcements;
CREATE POLICY "Market officers can manage their announcements"
  ON public.announcements FOR ALL USING (
    market_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
        AND u.market_id = announcements.market_id
        AND r.name IN ('ADMIN', 'MARKET_HEAD', 'TREASURER')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. transactions — INSERT policy + trigger validasi market
--    (konsolidasi dari fix_transactions_insert_rls.sql)
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper: market tempat user login bertugas
CREATE OR REPLACE FUNCTION public.get_current_user_market_id()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT market_id
  FROM public.users
  WHERE auth_uid = auth.uid()
  LIMIT 1;
$$;

-- Helper: cek admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.id_role
    WHERE u.auth_uid = auth.uid()
      AND UPPER(r.name) = 'ADMIN'
  );
$$;

-- Policy INSERT (sederhana, tanpa NEW — validasi di trigger)
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "officers_can_insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_can_insert_transactions" ON public.transactions;
CREATE POLICY "authenticated_can_insert_transactions"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (true);

-- Trigger validasi market
CREATE OR REPLACE FUNCTION public.validate_transaction_market()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  tx_market BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.market_id IS NOT NULL THEN
    tx_market := NEW.market_id;
  ELSIF NEW.stall_id IS NOT NULL THEN
    SELECT market_id INTO tx_market
    FROM public.stalls
    WHERE id = NEW.stall_id;
  END IF;

  IF tx_market IS NULL OR tx_market <> public.get_current_user_market_id() THEN
    RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat membuat transaksi untuk pasar tempat Anda bertugas'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transaction_market ON public.transactions;
CREATE TRIGGER trg_validate_transaction_market
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_market();

-- ============================================================================
-- END 003_rls_policies.sql
-- ============================================================================