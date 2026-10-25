-- ============================================================================
-- 013_restrict_anon_stall_owners_columns.sql
--
-- Menutup S-17: role `anon` dapat membaca seluruh kolom `stall_owners`
-- (termasuk nik, phone, address) karena SELECT policy `true` + grant tabel penuh.
--
-- Solusi tanpa mengubah aplikasi:
--   * cabut SELECT tabel untuk `anon`
--   * beri SELECT hanya pada kolom (id, name)
--   `MarketLandingPage` sudah memilih `id, name` secara eksplisit, sehingga tetap berjalan.
--   Role `authenticated` (staf) tetap memiliki akses penuh.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

REVOKE SELECT ON public.stall_owners FROM anon;
GRANT SELECT (id, name) ON public.stall_owners TO anon;

-- Verifikasi hak akses kolom
SELECT
  has_table_privilege('anon', 'public.stall_owners', 'SELECT') AS anon_table_select,
  has_column_privilege('anon', 'public.stall_owners', 'id', 'SELECT') AS anon_id,
  has_column_privilege('anon', 'public.stall_owners', 'name', 'SELECT') AS anon_name,
  has_column_privilege('anon', 'public.stall_owners', 'nik', 'SELECT') AS anon_nik,
  has_column_privilege('anon', 'public.stall_owners', 'phone', 'SELECT') AS anon_phone,
  has_column_privilege('anon', 'public.stall_owners', 'address', 'SELECT') AS anon_address,
  has_table_privilege('authenticated', 'public.stall_owners', 'SELECT') AS auth_table_select;

COMMIT;
