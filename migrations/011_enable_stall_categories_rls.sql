-- ============================================================================
-- 011_enable_stall_categories_rls.sql
--
-- Menutup S-14: `stall_categories` memiliki RLS NONAKTIF dan 0 policy.
--
-- Policy baru:
--   SELECT : authenticated (dipakai form lapak/owner; tidak dipakai halaman publik)
--   INSERT/UPDATE/DELETE : admin ATAU user yang punya role (staf)
--       (kategori bersifat master global; UI `CategoriesPage` tersedia di dashboard pasar,
--        sehingga kepala pasar/petugas sah tetap bisa mengelola)
--
-- Catatan: policy dibuat dalam transaksi yang sama dengan ENABLE RLS agar tabel tidak
-- sempat tertutup total di tengah migrasi.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.stall_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stall_categories_select_auth" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_insert_staff" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_update_staff" ON public.stall_categories;
DROP POLICY IF EXISTS "stall_categories_delete_staff" ON public.stall_categories;

CREATE POLICY "stall_categories_select_auth"
ON public.stall_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "stall_categories_insert_staff"
ON public.stall_categories
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_uid = auth.uid() AND u.id_role IS NOT NULL)
);

CREATE POLICY "stall_categories_update_staff"
ON public.stall_categories
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_uid = auth.uid() AND u.id_role IS NOT NULL)
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_uid = auth.uid() AND u.id_role IS NOT NULL)
);

CREATE POLICY "stall_categories_delete_staff"
ON public.stall_categories
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_uid = auth.uid() AND u.id_role IS NOT NULL)
);

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stall_categories'
ORDER BY cmd, policyname;

SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'stall_categories';

COMMIT;
