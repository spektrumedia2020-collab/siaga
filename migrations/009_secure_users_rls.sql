-- ============================================================================
-- 009_secure_users_rls.sql
--
-- Menutup eskalasi ADMIN (SECURITY S-11):
--   Policy lama: SELECT/INSERT/UPDATE `true` pada public.users.
--   Siapa pun yang login bisa membaca semua profil, menyisipkan profil, dan
--   mengubah `id_role` dirinya menjadi ADMIN (dipakai is_current_user_admin()).
--
-- Policy baru:
--   SELECT : baris sendiri | admin | staf pasar yang sama (perlu untuk daftar nama)
--   INSERT : admin | kepala pasar (hanya untuk pasar yang ia pimpin, role bukan ADMIN)
--   UPDATE : baris sendiri | admin | kepala pasar (pasar yang ia pimpin)
--   DELETE : tidak ada policy (service role saja) — sama seperti sebelumnya
--
-- Trigger BEFORE UPDATE `guard_users_privileged_columns`:
--   * non-admin tidak boleh mengubah auth_uid / akses_global
--   * perubahan id_role hanya oleh admin atau kepala pasar; role ADMIN hanya oleh admin
--   * perpindahan market_id hanya oleh admin atau kepala pasar kedua pasar
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper: kepala pasar untuk market tertentu
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_market_head(target_market_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    JOIN public.users u ON u.id_user = m.id_head_market
    WHERE m.id = target_market_id AND u.auth_uid = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.id_role
    WHERE u.auth_uid = auth.uid()
      AND u.market_id = target_market_id
      AND upper(r.name) IN ('MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.market_id = target_market_id
      AND upper(r.name) IN ('MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN')
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_market_head(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_market_head(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Ganti policy lama
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON public.users;

DROP POLICY IF EXISTS "users_select_own_admin_or_market" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin_or_head" ON public.users;
DROP POLICY IF EXISTS "users_update_own_admin_or_head" ON public.users;

CREATE POLICY "users_select_own_admin_or_market"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_uid = auth.uid()
  OR public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

CREATE POLICY "users_insert_admin_or_head"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR (
    market_id IS NOT NULL
    AND public.is_current_user_market_head(market_id)
    AND (
      id_role IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.roles r
        WHERE r.id = id_role AND upper(r.name) = 'ADMIN'
      )
    )
  )
);

CREATE POLICY "users_update_own_admin_or_head"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth_uid = auth.uid()
  OR public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_head(market_id))
)
WITH CHECK (
  auth_uid = auth.uid()
  OR public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_head(market_id))
);

-- ---------------------------------------------------------------------------
-- 3. Trigger penjaga kolom hak akses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_users_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / dashboard (tanpa JWT user) tetap boleh
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin_full() THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_uid IS DISTINCT FROM OLD.auth_uid
     OR NEW.akses_global IS DISTINCT FROM OLD.akses_global THEN
    RAISE EXCEPTION 'Perubahan auth_uid/akses_global hanya oleh admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id_role IS DISTINCT FROM OLD.id_role THEN
    IF NOT public.is_current_user_market_head(OLD.market_id) THEN
      RAISE EXCEPTION 'Perubahan peran hanya oleh admin atau kepala pasar'
        USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = NEW.id_role AND upper(r.name) = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'Peran ADMIN hanya dapat diberikan oleh admin'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.market_id IS DISTINCT FROM OLD.market_id THEN
    IF NOT (
      public.is_current_user_market_head(OLD.market_id)
      AND public.is_current_user_market_head(NEW.market_id)
    ) THEN
      RAISE EXCEPTION 'Pemindahan pasar hanya oleh admin atau kepala pasar terkait'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_users_privileged_columns ON public.users;
CREATE TRIGGER guard_users_privileged_columns
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.guard_users_privileged_columns();

-- ---------------------------------------------------------------------------
-- 4. Verifikasi
-- ---------------------------------------------------------------------------
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY cmd, policyname;

SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'public.users'::regclass AND NOT tgisinternal;

COMMIT;
