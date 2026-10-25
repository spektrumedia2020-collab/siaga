-- ============================================================================
-- 010_secure_operational_rls.sql
--
-- Menutup S-12 & S-13:
--   transactions : INSERT/SELECT/UPDATE `true`
--   stalls       : ALL `true`
--   stall_owners : ALL `true`
--
-- Policy baru:
--   transactions : admin ATAU staf pasar terkait (market_id baris)
--   stalls       : SELECT publik (landing page); tulis admin ATAU staf pasar terkait
--   stall_owners : SELECT publik (dipakai landing page); INSERT staf pasar;
--                  UPDATE/DELETE admin ATAU staf pasar yang memiliki lapak dengan owner tsb
--
-- Catatan:
--   * Tidak ada policy DELETE untuk transactions (sama seperti sebelumnya = deny).
--   * Landing page publik (`/@slug`) membaca `stalls` dan `stall_owners` tanpa login,
--     karena itu SELECT keduanya tetap terbuka.
--   * Paparan kolom sensitif `stall_owners` (nik/phone/address) untuk anon dicatat
--     sebagai item terpisah (perlu view publik terbatas).
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. transactions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_can_insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;

DROP POLICY IF EXISTS "transactions_select_market_member" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_market_member" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_market_member" ON public.transactions;

CREATE POLICY "transactions_select_market_member"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

CREATE POLICY "transactions_insert_market_member"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

CREATE POLICY "transactions_update_market_member"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

-- ---------------------------------------------------------------------------
-- 2. stalls
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage stalls" ON public.stalls;
DROP POLICY IF EXISTS "Stalls are viewable by everyone" ON public.stalls;

DROP POLICY IF EXISTS "stalls_select_public" ON public.stalls;
DROP POLICY IF EXISTS "stalls_insert_market_member" ON public.stalls;
DROP POLICY IF EXISTS "stalls_update_market_member" ON public.stalls;
DROP POLICY IF EXISTS "stalls_delete_market_member" ON public.stalls;

CREATE POLICY "stalls_select_public"
ON public.stalls
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "stalls_insert_market_member"
ON public.stalls
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

CREATE POLICY "stalls_update_market_member"
ON public.stalls
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

CREATE POLICY "stalls_delete_market_member"
ON public.stalls
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

-- ---------------------------------------------------------------------------
-- 3. stall_owners
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage stall owners" ON public.stall_owners;

DROP POLICY IF EXISTS "stall_owners_select_public" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_insert_market_staff" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_update_market_staff" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_delete_market_staff" ON public.stall_owners;

CREATE POLICY "stall_owners_select_public"
ON public.stall_owners
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "stall_owners_insert_market_staff"
ON public.stall_owners
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.market_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_uid = auth.uid() AND u.market_id IS NOT NULL
  )
);

CREATE POLICY "stall_owners_update_market_staff"
ON public.stall_owners
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR EXISTS (
    SELECT 1 FROM public.stalls s
    WHERE s.owner_id = stall_owners.id
      AND s.market_id IS NOT NULL
      AND public.is_current_user_market_member(s.market_id)
  )
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR EXISTS (
    SELECT 1 FROM public.stalls s
    WHERE s.owner_id = stall_owners.id
      AND s.market_id IS NOT NULL
      AND public.is_current_user_market_member(s.market_id)
  )
);

CREATE POLICY "stall_owners_delete_market_staff"
ON public.stall_owners
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR EXISTS (
    SELECT 1 FROM public.stalls s
    WHERE s.owner_id = stall_owners.id
      AND s.market_id IS NOT NULL
      AND public.is_current_user_market_member(s.market_id)
  )
);

-- ---------------------------------------------------------------------------
-- 4. Verifikasi
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'stalls', 'stall_owners')
ORDER BY tablename, cmd, policyname;

COMMIT;
