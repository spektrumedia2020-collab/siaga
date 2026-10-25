-- ============================================================================
-- 014_admin_only_market_management.sql
--
-- Keputusan: MARKET_HEAD menjadi READ-ONLY. Semua penulisan master/operasional
-- dilakukan oleh ADMIN. Role rows tidak diubah.
--
-- Tetap dipertahankan (bukan kewenangan kepala pasar):
--   * OFFICER  : INSERT transaksi & absensi miliknya, INSERT setoran miliknya
--   * TREASURER: UPDATE setoran (approval tahap 1) pada pasar terkait
--   * semua user: UPDATE profil sendiri (kolom aman; trigger tetap menjaga)
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. markets
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "markets_update_admin_or_head" ON public.markets;
DROP POLICY IF EXISTS "markets_update_admin" ON public.markets;

CREATE POLICY "markets_update_admin"
ON public.markets
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 2. market_sectors
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "market_sectors_insert_admin_or_head" ON public.market_sectors;
DROP POLICY IF EXISTS "market_sectors_update_admin_or_head" ON public.market_sectors;
DROP POLICY IF EXISTS "market_sectors_delete_admin_or_head" ON public.market_sectors;

DROP POLICY IF EXISTS "market_sectors_insert_admin" ON public.market_sectors;
DROP POLICY IF EXISTS "market_sectors_update_admin" ON public.market_sectors;
DROP POLICY IF EXISTS "market_sectors_delete_admin" ON public.market_sectors;

CREATE POLICY "market_sectors_insert_admin"
ON public.market_sectors FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "market_sectors_update_admin"
ON public.market_sectors FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "market_sectors_delete_admin"
ON public.market_sectors FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 3. market_config
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Market officers can insert their market config" ON public.market_config;
DROP POLICY IF EXISTS "Market officers can update their market config" ON public.market_config;
DROP POLICY IF EXISTS "market_config_insert_admin" ON public.market_config;
DROP POLICY IF EXISTS "market_config_update_admin" ON public.market_config;

CREATE POLICY "market_config_insert_admin"
ON public.market_config FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "market_config_update_admin"
ON public.market_config FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 4. announcements
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Market officers can manage their announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;

CREATE POLICY "announcements_admin_all"
ON public.announcements FOR ALL TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 5. retribution_rates
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "retribution_rates_insert" ON public.retribution_rates;
DROP POLICY IF EXISTS "retribution_rates_update" ON public.retribution_rates;
DROP POLICY IF EXISTS "retribution_rates_delete" ON public.retribution_rates;

CREATE POLICY "retribution_rates_insert"
ON public.retribution_rates FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "retribution_rates_update"
ON public.retribution_rates FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "retribution_rates_delete"
ON public.retribution_rates FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 6. stalls (SELECT publik tetap)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "stalls_insert_market_member" ON public.stalls;
DROP POLICY IF EXISTS "stalls_update_market_member" ON public.stalls;
DROP POLICY IF EXISTS "stalls_delete_market_member" ON public.stalls;
DROP POLICY IF EXISTS "stalls_insert_admin" ON public.stalls;
DROP POLICY IF EXISTS "stalls_update_admin" ON public.stalls;
DROP POLICY IF EXISTS "stalls_delete_admin" ON public.stalls;

CREATE POLICY "stalls_insert_admin"
ON public.stalls FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "stalls_update_admin"
ON public.stalls FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "stalls_delete_admin"
ON public.stalls FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 7. stall_owners (SELECT publik & kolom anon dibatasi migration 013)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "stall_owners_insert_market_staff" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_update_market_staff" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_delete_market_staff" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_insert_admin" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_update_admin" ON public.stall_owners;
DROP POLICY IF EXISTS "stall_owners_delete_admin" ON public.stall_owners;

CREATE POLICY "stall_owners_insert_admin"
ON public.stall_owners FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "stall_owners_update_admin"
ON public.stall_owners FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "stall_owners_delete_admin"
ON public.stall_owners FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 8. transactions
--    INSERT tetap untuk staf pasar (petugas mencatat retribusi)
--    SELECT tetap market-scoped (read-only bagi kepala pasar)
--    UPDATE hanya ADMIN
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_update_market_member" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_admin" ON public.transactions;

CREATE POLICY "transactions_update_admin"
ON public.transactions FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 9. setoran
--    INSERT: petugas (own + market) tetap
--    SELECT: own/approver (kepala pasar boleh membaca)
--    UPDATE: ADMIN atau TREASURER pasar terkait (approval tahap 1)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "setoran_update_market_approver" ON public.setoran;
DROP POLICY IF EXISTS "setoran_update_admin_or_treasurer" ON public.setoran;

CREATE POLICY "setoran_update_admin_or_treasurer"
ON public.setoran FOR UPDATE TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (
    market_id IS NOT NULL
    AND public.current_user_has_market_role(market_id, ARRAY['TREASURER'])
  )
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR (
    market_id IS NOT NULL
    AND public.current_user_has_market_role(market_id, ARRAY['TREASURER'])
  )
);

-- ---------------------------------------------------------------------------
-- 10. users
--     INSERT hanya ADMIN; UPDATE own profile atau ADMIN
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_insert_admin_or_head" ON public.users;
DROP POLICY IF EXISTS "users_update_own_admin_or_head" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;

CREATE POLICY "users_insert_admin"
ON public.users FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "users_update_own_or_admin"
ON public.users FOR UPDATE TO authenticated
USING (auth_uid = auth.uid() OR public.is_current_user_admin_full())
WITH CHECK (auth_uid = auth.uid() OR public.is_current_user_admin_full());

-- Trigger: perubahan kolom hak akses hanya ADMIN
CREATE OR REPLACE FUNCTION public.guard_users_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_current_user_admin_full() THEN RETURN NEW; END IF;

  IF NEW.auth_uid IS DISTINCT FROM OLD.auth_uid
     OR NEW.akses_global IS DISTINCT FROM OLD.akses_global
     OR NEW.id_role IS DISTINCT FROM OLD.id_role
     OR NEW.market_id IS DISTINCT FROM OLD.market_id THEN
    RAISE EXCEPTION 'Perubahan hak akses hanya oleh admin' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 11. retribution_types (SELECT authenticated tetap)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "retribution_types_insert_staff" ON public.retribution_types;
DROP POLICY IF EXISTS "retribution_types_insert_admin" ON public.retribution_types;

CREATE POLICY "retribution_types_insert_admin"
ON public.retribution_types FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 12. stall_categories (SELECT authenticated tetap)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "stall_categories_insert_staff" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_update_staff" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_delete_staff" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_insert_admin" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_update_admin" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_delete_admin" ON public.stall_categories;

CREATE POLICY "stall_categories_insert_admin"
ON public.stall_categories FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "stall_categories_update_admin"
ON public.stall_categories FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "stall_categories_delete_admin"
ON public.stall_categories FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 13. Verifikasi ringkas
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd,
       CASE WHEN qual LIKE '%is_current_user_admin_full%'
              OR with_check LIKE '%is_current_user_admin_full%'
            THEN 'admin' ELSE 'other' END AS guard
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('markets','market_sectors','market_config','announcements',
                    'retribution_rates','stalls','stall_owners','transactions',
                    'setoran','users','retribution_types','stall_categories')
ORDER BY tablename, cmd, policyname;

COMMIT;
