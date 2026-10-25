-- ============================================================================
-- 008_secure_retribution_rates_rls.sql
--
-- Menutup celah integritas finansial (SECURITY S-05):
--   retribution_rates sebelumnya SELECT/INSERT/UPDATE/DELETE TO authenticated
--   dengan USING (true) / WITH CHECK (true) -> user login mana pun bisa
--   mengubah tarif pasar mana pun.
--
-- Policy baru:
--   SELECT : authenticated (data referensi, tetap dibaca lintas halaman)
--   INSERT : admin ATAU staf pasar terkait (market_id baris)
--   UPDATE : admin ATAU staf pasar terkait (USING + WITH CHECK)
--   DELETE : admin ATAU staf pasar terkait
--
-- "Staf pasar terkait" = punya baris user_roles untuk pasar itu, ATAU
-- users.market_id = pasar itu, ATAU terdaftar sebagai markets.id_head_market.
-- Ini mempertahankan alur MarketDashboard (StallsPage) untuk role pasar.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_current_user_market_member(target_market_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.market_id = target_market_id
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_uid = auth.uid() AND u.market_id = target_market_id
  )
  OR EXISTS (
    SELECT 1 FROM public.markets m
    JOIN public.users u ON u.id_user = m.id_head_market
    WHERE m.id = target_market_id AND u.auth_uid = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_market_member(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_market_member(bigint) TO authenticated;

ALTER TABLE public.retribution_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retribution_rates_select" ON public.retribution_rates;
DROP POLICY IF EXISTS "retribution_rates_insert" ON public.retribution_rates;
DROP POLICY IF EXISTS "retribution_rates_update" ON public.retribution_rates;
DROP POLICY IF EXISTS "retribution_rates_delete" ON public.retribution_rates;

CREATE POLICY "retribution_rates_select"
ON public.retribution_rates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "retribution_rates_insert"
ON public.retribution_rates
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR public.is_current_user_market_member(market_id)
);

CREATE POLICY "retribution_rates_update"
ON public.retribution_rates
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR public.is_current_user_market_member(market_id)
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR public.is_current_user_market_member(market_id)
);

CREATE POLICY "retribution_rates_delete"
ON public.retribution_rates
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR public.is_current_user_market_member(market_id)
);

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'retribution_rates'
ORDER BY cmd, policyname;

COMMIT;
