-- ============================================================================
-- FIX: RLS policy UPDATE/INSERT/DELETE untuk tabel markets
-- ============================================================================
-- MASALAH: Tabel markets hanya punya policy SELECT (public).
-- Akibatnya admin/kepala pasar TIDAK BISA edit pasar dari superadmin dashboard
-- (RLS memblokir UPDATE secara diam-diam).
--
-- SOLUSI:
--   - UPDATE : ADMIN (semua pasar) ATAU MARKET_HEAD (pasar yang dipimpin)
--   - INSERT : hanya ADMIN
--   - DELETE : hanya ADMIN
--
-- Dependensi: function public.is_current_user_admin() (sudah ada di 003_rls)
-- ============================================================================

-- Policy UPDATE: admin bebas; kepala pasar hanya pasar miliknya
DROP POLICY IF EXISTS "markets_update_admin_or_head" ON public.markets;
CREATE POLICY "markets_update_admin_or_head"
ON public.markets
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin()
  OR id_head_market = (
    SELECT id_user FROM public.users WHERE auth_uid = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  public.is_current_user_admin()
  OR id_head_market = (
    SELECT id_user FROM public.users WHERE auth_uid = auth.uid() LIMIT 1
  )
);

-- Policy INSERT: hanya ADMIN
DROP POLICY IF EXISTS "markets_insert_admin" ON public.markets;
CREATE POLICY "markets_insert_admin"
ON public.markets
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

-- Policy DELETE: hanya ADMIN
DROP POLICY IF EXISTS "markets_delete_admin" ON public.markets;
CREATE POLICY "markets_delete_admin"
ON public.markets
FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

-- ============================================================================
-- VERIFIKASI (jalankan terpisah):
--   SELECT policyname, cmd FROM pg_policies WHERE tablename='markets';
-- ============================================================================
