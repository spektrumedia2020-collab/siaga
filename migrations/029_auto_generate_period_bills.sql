-- ============================================================================
-- 029_auto_generate_period_bills.sql
--
-- Terbitkan tagihan periode (mingguan/bulanan) secara otomatis setiap hari
-- lewat pg_cron, supaya admin tidak perlu menekan "Terbitkan Periode" tiap
-- minggu/bulan. Tombol manual di aplikasi tetap tersedia.
--
-- Cara kerja:
--   - run_period_billing_cron(): mencari kombinasi pasar+jenis yang punya tarif
--     berirama MINGGUAN/BULANAN, lalu memanggil generate_current_period_bills()
--     yang sudah ada (idempoten).
--   - Karena fungsi RPC itu memeriksa izin, cron memakai identitas admin
--     (auth_uid admin pertama) hanya di dalam transaksi cron.
--   - Job harian 16:05 UTC = 00:05 WITA (Asia/Makassar).
--
-- PRASYARAT: ekstensi pg_cron harus aktif.
--   Supabase Dashboard -> Database -> Extensions -> aktifkan "pg_cron",
--   baru jalankan berkas ini di SQL Editor.
--
-- Idempoten. Jalankan setelah 026/027/028.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.retribution_rates') IS NULL
     OR to_regclass('public.retribution_bills') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'generate_current_period_bills'
     ) THEN
    RAISE EXCEPTION 'Migrasi 025/026 belum lengkap di database ini.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'Ekstensi pg_cron belum aktif. Aktifkan di Supabase Dashboard -> Database -> Extensions -> pg_cron, lalu jalankan ulang migrasi ini.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.run_period_billing_cron()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  r record;
  v_total integer := 0;
BEGIN
  -- RPC yang dipanggil memeriksa is_current_user_admin_full(); beri identitas
  -- admin hanya untuk transaksi cron ini.
  SELECT u.auth_uid
  INTO v_admin
  FROM public.users u
  JOIN public.roles ro ON ro.id = u.id_role
  WHERE upper(ro.name) = 'ADMIN'
    AND u.auth_uid IS NOT NULL
  ORDER BY u.id_user
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Tidak ada akun ADMIN dengan auth_uid; cron tagihan periode tidak dapat berjalan.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true
  );

  FOR r IN
    SELECT DISTINCT rt.market_id, rt.types_id
    FROM public.retribution_rates rt
    JOIN public.retribution_types t ON t.id = rt.types_id
    WHERE rt.market_id IS NOT NULL
      AND rt.stall_id IS NOT NULL
      AND rt.collection_period IN ('MINGGUAN', 'BULANAN')
      AND coalesce(t.billing_period, '') <> 'TAHUNAN'
    ORDER BY rt.market_id, rt.types_id
  LOOP
    v_total := v_total + public.generate_current_period_bills(r.market_id, r.types_id, NULL);
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.run_period_billing_cron() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_period_billing_cron() FROM anon;
REVOKE ALL ON FUNCTION public.run_period_billing_cron() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.run_period_billing_cron() TO postgres;

-- Jadwal harian. pg_cron memakai UTC: 16:05 UTC = 00:05 WITA.
DO $$
DECLARE
  v_job bigint;
BEGIN
  SELECT jobid INTO v_job FROM cron.job WHERE jobname = 'generate_period_bills_daily' LIMIT 1;
  IF v_job IS NOT NULL THEN
    PERFORM cron.unschedule(v_job);
  END IF;

  PERFORM cron.schedule(
    'generate_period_bills_daily',
    '5 16 * * *',
    'select public.run_period_billing_cron();'
  );
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikasi:
-- SELECT jobid, jobname, schedule, active, command
-- FROM cron.job WHERE jobname = 'generate_period_bills_daily';
--
-- SELECT * FROM cron.job_run_details
-- ORDER BY start_time DESC LIMIT 5;

-- Uji manual (jalankan kapan saja, idempoten):
-- SELECT public.run_period_billing_cron();

-- Menonaktifkan otomatis:
-- DO $$ DECLARE v bigint;
-- BEGIN
--   SELECT jobid INTO v FROM cron.job WHERE jobname = 'generate_period_bills_daily' LIMIT 1;
--   IF v IS NOT NULL THEN PERFORM cron.unschedule(v); END IF;
-- END $$;
