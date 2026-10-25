-- ============================================================================
-- 007_secure_user_roles_rls.sql
--
-- Menutup eskalasi peran (SECURITY S-02):
--   create_user_roles_table.sql sebelumnya memberi SELECT/INSERT/UPDATE/DELETE
--   TO authenticated dengan USING (true) / WITH CHECK (true).
--   Artinya user login mana pun bisa menulis peran sendiri (termasuk ADMIN).
--
-- Policy baru:
--   SELECT  : baris milik sendiri ATAU admin
--   INSERT  : admin
--   UPDATE  : admin
--   DELETE  : admin
--
-- Catatan:
--   * service_role (api/users.ts, Express) melewati RLS → alur admin tetap jalan.
--   * Cek admin memakai SECURITY DEFINER agar tidak terjadi rekursi RLS saat
--     policy user_roles membaca user_roles.
--   * Idempoten: aman dijalankan berulang (DROP POLICY IF EXISTS + CREATE OR REPLACE).
--
-- Jalankan di Supabase SQL Editor (role postgres), atau via koneksi DATABASE_URL.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper admin (users.id_role DAN user_roles), bypass RLS via SECURITY DEFINER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_admin_full()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.id_role
    WHERE u.auth_uid = auth.uid()
      AND upper(r.name) = 'ADMIN'
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND upper(r.name) = 'ADMIN'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin_full() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin_full() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Pastikan RLS aktif
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Hapus policy lama (permisif) + nama baru (idempoten)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

-- ---------------------------------------------------------------------------
-- 4. Policy baru
-- ---------------------------------------------------------------------------
CREATE POLICY "user_roles_select_own_or_admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_current_user_admin_full()
);

CREATE POLICY "user_roles_insert_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "user_roles_update_admin"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_current_user_admin_full());

-- ---------------------------------------------------------------------------
-- 5. Verifikasi (harus muncul 4 policy baru, tanpa USING (true))
-- ---------------------------------------------------------------------------
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_roles'
ORDER BY cmd, policyname;

COMMIT;
