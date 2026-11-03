-- ============================================================================
-- 030_block_daily_billing_for_period_stalls.sql
--
-- Lapak yang tarifnya berirama MINGGUAN/BULANAN tidak boleh ditagih harian.
-- Tanpa penjagaan ini, petugas bisa mencolok transaksi harian padahal lapak
-- sudah punya tagihan periode -> pembayaran dobel.
--
-- Aturan:
--   - Transaksi harian (bill_id NULL) dengan rate_id yang cadence-nya
--     MINGGUAN/BULANAN ditolak.
--   - Pembayaran tagihan periode (bill_id terisi) tetap boleh; RPC tagihan
--     mengisi bill_id dan rate_id sekaligus.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.transactions') IS NULL
     OR to_regclass('public.retribution_rates') IS NULL THEN
    RAISE EXCEPTION 'Tabel transactions/retribution_rates tidak ditemukan. Periksa koneksi SQL Editor (proyek siaga.app).';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_daily_transaction_cadence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
BEGIN
  IF NEW.bill_id IS NULL AND NEW.rate_id IS NOT NULL THEN
    SELECT r.collection_period
    INTO v_period
    FROM public.retribution_rates r
    WHERE r.id = NEW.rate_id;

    IF v_period IN ('MINGGUAN', 'BULANAN') THEN
      RAISE EXCEPTION 'Lapak ini ditagih %; gunakan pembayaran tagihan periode, bukan penagihan harian.', v_period;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_daily_transaction_cadence ON public.transactions;
CREATE TRIGGER trg_guard_daily_transaction_cadence
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_daily_transaction_cadence();

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikasi:
-- SELECT tgname FROM pg_trigger
-- WHERE tgrelid = 'public.transactions'::regclass AND NOT tgisinternal;

-- Uji (rollback): transaksi harian untuk tarif mingguan harus gagal.
-- BEGIN;
--   INSERT INTO public.transactions (market_id, stall_id, rate_id, amount, status)
--   SELECT 39, 8364, id, 5000, 'paid' FROM public.retribution_rates
--   WHERE stall_id = 8364 AND types_id = 103 AND collection_period = 'MINGGUAN' LIMIT 1;
-- ROLLBACK;
