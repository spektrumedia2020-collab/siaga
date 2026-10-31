-- ============================================================================
-- 021_revoke_anon_billing_rpcs.sql
--
-- Supabase memberi EXECUTE bawaan kepada role `anon` saat fungsi dibuat,
-- sehingga REVOKE ALL FROM PUBLIC pada migration 020 belum cukup.
-- Kedua RPC tagihan sudah menolak anon lewat cek internal, tetapi hak
-- eksekusinya sebaiknya dicabut eksplisit (defense in depth).
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

REVOKE ALL ON FUNCTION public.generate_retribution_bills(bigint, integer, bigint, date) FROM anon;
REVOKE ALL ON FUNCTION public.generate_retribution_bills(bigint, integer, bigint, date) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_retribution_bills(bigint, integer, bigint, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text) TO authenticated;

COMMIT;

-- Verifikasi: anon harus false, authenticated harus true.
-- SELECT p.proname, r.rolname,
--        has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- JOIN pg_roles r ON r.rolname IN ('anon', 'authenticated')
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('generate_retribution_bills', 'pay_retribution_bills')
-- ORDER BY p.proname, r.rolname;
