-- ============================================================================
-- 015_remove_treasurer_role.sql
--
-- Keputusan: role TREASURER dihapus total (database + auth).
-- ADMIN mengambil alih kedua tahap approval setoran (status tetap:
-- pending_treasurer -> pending_head -> approved).
--
-- Akun yang dihapus (terverifikasi tanpa dependensi):
--   id_user 7  bendahara@siaga.id               auth 87c0bbb5-6ec7-4d27-96c9-e49d41d6fb04
--   id_user 8  bendahara_psterong@siaga.app     auth cb1847bb-946f-4d8c-b33b-b0607f5aec16
--   officers=0, setoran sebagai officer=0, attendance=0, approved_by_treasurer=0
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

DELETE FROM public.user_roles
WHERE user_id IN (
  '87c0bbb5-6ec7-4d27-96c9-e49d41d6fb04',
  'cb1847bb-946f-4d8c-b33b-b0607f5aec16'
);

DELETE FROM public.users
WHERE auth_uid IN (
  '87c0bbb5-6ec7-4d27-96c9-e49d41d6fb04',
  'cb1847bb-946f-4d8c-b33b-b0607f5aec16'
);

DELETE FROM auth.users
WHERE id IN (
  '87c0bbb5-6ec7-4d27-96c9-e49d41d6fb04',
  'cb1847bb-946f-4d8c-b33b-b0607f5aec16'
);

DELETE FROM public.roles
WHERE upper(name) = 'TREASURER';

-- Setoran: hanya ADMIN yang boleh update (approval dua tahap dijalankan admin)
DROP POLICY IF EXISTS "setoran_update_admin_or_treasurer" ON public.setoran;
DROP POLICY IF EXISTS "setoran_update_admin" ON public.setoran;

CREATE POLICY "setoran_update_admin"
ON public.setoran FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

-- Verifikasi
SELECT
  (SELECT count(*) FROM public.roles WHERE upper(name) = 'TREASURER') AS treasurer_role_rows,
  (SELECT count(*) FROM public.users WHERE auth_uid IN (
     '87c0bbb5-6ec7-4d27-96c9-e49d41d6fb04',
     'cb1847bb-946f-4d8c-b33b-b0607f5aec16')) AS public_users_left,
  (SELECT count(*) FROM auth.users WHERE id IN (
     '87c0bbb5-6ec7-4d27-96c9-e49d41d6fb04',
     'cb1847bb-946f-4d8c-b33b-b0607f5aec16')) AS auth_users_left,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
     AND tablename = 'setoran' AND policyname = 'setoran_update_admin') AS setoran_admin_policy;

COMMIT;
