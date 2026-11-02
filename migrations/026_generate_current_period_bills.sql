-- ============================================================================
-- 026_generate_current_period_bills.sql
--
-- Menutup celah migration 025: generate_period_bills menagih SEMUA lapak yang
-- punya tarif, tanpa melihat irama penagihan. Begitu sebagian lapak diset
-- MINGGUAN, penerbitan massal untuk satu minggu akan ikut menagih lapak yang
-- masih HARIAN.
--
-- Fungsi ini hanya memproses tarif terbaru per lapak+jenis yang
-- collection_period-nya MINGGUAN atau BULANAN, lalu memanggil
-- ensure_current_period_bill untuk setiap pasangan (anchor minggu/bulan
-- dihitung per tarif, jadi lapak boleh beda hari tagih).
--
-- Idempoten: periode yang sudah ada tidak diduplikasi.
-- Jalankan di Supabase SQL Editor setelah 025.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.retribution_bills') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'ensure_current_period_bill'
     ) THEN
    RAISE EXCEPTION 'Migration 025 belum diterapkan di database ini. Jalankan 025_retribution_period_bills.sql lebih dulu.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_current_period_bills(
  p_market_id bigint,
  p_types_id bigint DEFAULT NULL,
  p_stall_id bigint DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_bill_id bigint;
BEGIN
  IF NOT (public.is_current_user_admin_full() OR public.is_current_user_market_member(p_market_id)) THEN
    RAISE EXCEPTION 'Tidak berwenang menerbitkan tagihan pasar ini';
  END IF;

  IF p_market_id IS NULL THEN
    RAISE EXCEPTION 'Pasar wajib diisi';
  END IF;

  IF p_stall_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.stalls s
    WHERE s.id = p_stall_id AND s.market_id = p_market_id
  ) THEN
    RAISE EXCEPTION 'Lapak % bukan milik pasar %', p_stall_id, p_market_id;
  END IF;

  FOR r IN
    WITH latest_rate AS (
      SELECT DISTINCT ON (rt.stall_id, rt.types_id)
             rt.stall_id, rt.types_id, rt.collection_period
      FROM public.retribution_rates rt
      WHERE rt.market_id = p_market_id
        AND rt.stall_id IS NOT NULL
      ORDER BY rt.stall_id, rt.types_id, rt.created_at DESC, rt.id DESC
    )
    SELECT lr.stall_id, lr.types_id
    FROM latest_rate lr
    JOIN public.stalls s ON s.id = lr.stall_id
    WHERE lr.collection_period IN ('MINGGUAN', 'BULANAN')
      AND s.market_id = p_market_id
      AND s.status = 'AKTIF'
      AND (p_types_id IS NULL OR lr.types_id = p_types_id)
      AND (p_stall_id IS NULL OR lr.stall_id = p_stall_id)
    ORDER BY lr.stall_id, lr.types_id
  LOOP
    v_bill_id := public.ensure_current_period_bill(r.stall_id, r.types_id);
    IF v_bill_id IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_current_period_bills(bigint, bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_current_period_bills(bigint, bigint, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_current_period_bills(bigint, bigint, bigint) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikasi:
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) args
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'generate_current_period_bills';
--
-- SELECT r.rolname, has_function_privilege(r.oid, p.oid, 'EXECUTE') can_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- JOIN pg_roles r ON r.rolname IN ('anon', 'authenticated')
-- WHERE n.nspname = 'public' AND p.proname = 'generate_current_period_bills';

-- Uji (rollback): hanya lapak ber-irama MINGGUAN yang mendapat tagihan.
-- BEGIN;
--   UPDATE public.retribution_rates SET collection_period = 'MINGGUAN', collection_anchor = 1
--   WHERE stall_id = 8364 AND types_id = 103;
--   SELECT public.generate_current_period_bills(39, 103) AS ensured;  -- >= 1
--   SELECT public.generate_current_period_bills(39, 103) AS ensured;  -- idempoten, jumlah sama
-- ROLLBACK;
