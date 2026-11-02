-- ============================================================================
-- 027_offline_payment_and_attendance.sql
--
-- Dukungan antrean offline mobile (Fase 2):
--   1) transactions.client_uuid + index — penanda idempoten satu batch
--      pembayaran tagihan yang dikirim ulang setelah sinyal pulih.
--   2) attendance.client_uuid + unique index — check-in/out offline dapat
--      di-upsert berulang tanpa membuat baris ganda.
--   3) pay_retribution_bills menerima p_client_uuid dan mengembalikan alokasi
--      yang sudah ada bila batch yang sama dikirim ulang (tidak membebankan
--      dua kali). Pemanggil lama tanpa parameter tetap kompatibel.
--
-- Idempoten. Jalankan di Supabase SQL Editor setelah 025.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.transactions') IS NULL
     OR to_regclass('public.attendance') IS NULL
     OR to_regclass('public.retribution_bills') IS NULL THEN
    RAISE EXCEPTION 'Tabel dasar tidak ditemukan. Pastikan SQL Editor terhubung ke proyek siaga.app (ref hlvsbmxpkqvniemunygh).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Kolom idempotensi
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_uuid uuid;
CREATE INDEX IF NOT EXISTS idx_transactions_client_uuid
  ON public.transactions (client_uuid);

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS client_uuid uuid;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_client_uuid_key
  ON public.attendance (client_uuid)
  WHERE client_uuid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) pay_retribution_bills + p_client_uuid
--    Signature lama (6 argumen) dihapus agar pemanggilan 6 argumen tidak
--    ambigu; parameter baru punya DEFAULT sehingga web/mobile lama tetap jalan.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.pay_retribution_bills(bigint, numeric, bigint, text, text, text);

CREATE OR REPLACE FUNCTION public.pay_retribution_bills(
  p_stall_id bigint,
  p_amount numeric,
  p_types_id bigint DEFAULT NULL,
  p_payment_method text DEFAULT 'Tunai',
  p_payer_name text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_client_uuid uuid DEFAULT NULL
)
RETURNS TABLE (bill_id bigint, period_year integer, amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bill record;
  remaining numeric;
  applied numeric;
  stall_market bigint;
  bill_rate_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran harus lebih dari 0';
  END IF;

  SELECT s.market_id INTO stall_market FROM public.stalls s WHERE s.id = p_stall_id;
  IF stall_market IS NULL THEN
    RAISE EXCEPTION 'Lapak % tidak ditemukan', p_stall_id;
  END IF;

  IF NOT (public.is_current_user_admin_full() OR public.is_current_user_market_member(stall_market)) THEN
    RAISE EXCEPTION 'Tidak berwenang membayar tagihan pasar ini';
  END IF;

  -- Batch offline yang sama dikirim ulang: kembalikan alokasi lama, jangan
  -- menagih dua kali.
  IF p_client_uuid IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.client_uuid = p_client_uuid AND t.stall_id = p_stall_id
    ) THEN
      RETURN QUERY
        SELECT t.bill_id, t.period_year, t.amount
        FROM public.transactions t
        WHERE t.client_uuid = p_client_uuid AND t.stall_id = p_stall_id
        ORDER BY t.id;
      RETURN;
    END IF;
  END IF;

  remaining := p_amount;

  FOR bill IN
    SELECT b.id, b.market_id, b.stall_id, b.types_id, b.period_year,
           b.amount_due - coalesce((
             SELECT sum(t.amount) FROM public.transactions t
             WHERE t.bill_id = b.id AND public.is_paid_transaction_status(t.status)
           ), 0) AS outstanding
    FROM public.retribution_bills b
    WHERE b.stall_id = p_stall_id
      AND b.status = 'AKTIF'
      AND (p_types_id IS NULL OR b.types_id = p_types_id)
      AND b.amount_due > coalesce((
        SELECT sum(t.amount) FROM public.transactions t
        WHERE t.bill_id = b.id AND public.is_paid_transaction_status(t.status)
      ), 0)
    ORDER BY b.period_start ASC, b.period_end ASC, b.id ASC
  LOOP
    EXIT WHEN remaining <= 0;

    applied := least(remaining, bill.outstanding);
    IF applied <= 0 THEN
      CONTINUE;
    END IF;

    SELECT r.id INTO bill_rate_id
    FROM public.retribution_rates r
    WHERE r.stall_id = bill.stall_id AND r.types_id = bill.types_id
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT 1;

    INSERT INTO public.transactions (
      market_id, stall_id, rate_id, bill_id, period_year, amount,
      payment_method, payer_name, status, source, sync_status, note, client_uuid
    ) VALUES (
      bill.market_id, bill.stall_id, bill_rate_id, bill.id, bill.period_year, applied,
      coalesce(p_payment_method, 'Tunai'), p_payer_name, 'paid', 'TAGIHAN', 'SYNCED', p_note,
      p_client_uuid
    );

    remaining := remaining - applied;

    bill_id := bill.id;
    period_year := bill.period_year;
    amount := applied;
    RETURN NEXT;
  END LOOP;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Pembayaran melebihi total tunggakan (lebih %)', remaining;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text, uuid) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikasi:
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) args
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'pay_retribution_bills';
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('transactions','attendance')
--   AND column_name = 'client_uuid';

-- Uji idempotensi (rollback):
-- BEGIN;
--   SELECT * FROM public.pay_retribution_bills(8364, 1000, 104, 'Tunai', 'Uji', NULL,
--     '11111111-2222-4333-8444-555555555555');
--   SELECT * FROM public.pay_retribution_bills(8364, 1000, 104, 'Tunai', 'Uji', NULL,
--     '11111111-2222-4333-8444-555555555555');  -- baris sama, tidak menambah pembayaran
-- ROLLBACK;
