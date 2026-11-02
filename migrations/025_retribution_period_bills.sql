-- ============================================================================
-- 025_retribution_period_bills.sql
--
-- Retribusi harian yang dibayar mingguan / per rentang tanggal.
--
-- Prinsip: tarif tetap mengikuti satuan jenis retribusi (HARIAN = per hari).
-- Yang dipisahkan adalah IRAMA PENAGIHAN (collection_period) per tarif lapak:
--   HARIAN  : bayar per hari (perilaku lama)
--   MINGGUAN: satu tagihan untuk 7 hari (mis. Senin–Minggu)
--   BULANAN : satu tagihan untuk satu bulan (anchor hari ke-1..31)
--   TAHUNAN : memakai generate_retribution_bills (tagihan tahunan)
--
-- Isi:
--   1) retribution_bills: period_kind, period_start, period_end + backfill
--   2) unique (stall, jenis, period_start, period_end) + guard anti-overlap
--   3) retribution_rates: collection_period + collection_anchor
--   4) generate_retribution_bills: isi periode tahunan + conflict target baru
--   5) pay_retribution_bills: FIFO berdasarkan period_start (bukan period_year)
--   6) generate_period_bills: terbitkan tagihan untuk rentang tanggal
--   7) ensure_current_period_bill: pastikan tagihan minggu/bulan berjalan ada
--   8) view retribution_bill_balances: tambah kolom periode
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Prasyarat: tabel tagihan dibuat oleh migrasi 020. Gagal cepat dengan
--    pesan jelas bila SQL Editor terhubung ke database lain.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.retribution_bills') IS NULL
     OR to_regclass('public.retribution_rates') IS NULL
     OR to_regclass('public.retribution_types') IS NULL
     OR to_regclass('public.transactions') IS NULL
     OR to_regclass('public.stalls') IS NULL THEN
    RAISE EXCEPTION 'Tabel retribusi tidak ditemukan. Database ini belum menerima migrasi 020_retribution_annual_bills.sql — pastikan SQL Editor terhubung ke proyek siaga.app (ref hlvsbmxpkqvniemunygh, branch main PRODUCTION).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Tagihan: periode tanggal
-- ---------------------------------------------------------------------------
ALTER TABLE public.retribution_bills
  ADD COLUMN IF NOT EXISTS period_kind text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date;

UPDATE public.retribution_bills
SET period_start = make_date(period_year, 1, 1)
WHERE period_start IS NULL;

UPDATE public.retribution_bills
SET period_end = make_date(period_year, 12, 31)
WHERE period_end IS NULL;

UPDATE public.retribution_bills
SET period_kind = 'TAHUNAN'
WHERE period_kind IS NULL;

ALTER TABLE public.retribution_bills
  ALTER COLUMN period_kind SET DEFAULT 'CUSTOM',
  ALTER COLUMN period_kind SET NOT NULL,
  ALTER COLUMN period_start SET NOT NULL,
  ALTER COLUMN period_end SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retribution_bills_period_kind_check'
      AND conrelid = 'public.retribution_bills'::regclass
  ) THEN
    ALTER TABLE public.retribution_bills
      ADD CONSTRAINT retribution_bills_period_kind_check
      CHECK (period_kind IN ('HARIAN', 'MINGGUAN', 'BULANAN', 'TAHUNAN', 'CUSTOM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retribution_bills_period_range_check'
      AND conrelid = 'public.retribution_bills'::regclass
  ) THEN
    ALTER TABLE public.retribution_bills
      ADD CONSTRAINT retribution_bills_period_range_check
      CHECK (period_end >= period_start);
  END IF;
END $$;

-- Unique lama (stall, jenis, tahun) tidak lagi cukup: satu tahun bisa berisi
-- banyak periode mingguan. Ganti dengan unique per rentang tanggal.
ALTER TABLE public.retribution_bills
  DROP CONSTRAINT IF EXISTS retribution_bills_unique;

-- Jaring pengaman bila constraint lama diberi nama lain: cari unique constraint
-- dengan kolom tepat (stall_id, types_id, period_year), lalu hapus. Tanpa ini,
-- tagihan mingguan kedua di tahun yang sama akan ditolak.
DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'retribution_bills'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname ORDER BY att.attname)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att
          ON att.attrelid = rel.oid AND att.attnum = k.attnum
      ) = ARRAY['period_year', 'stall_id', 'types_id']::name[]
  LOOP
    EXECUTE format('ALTER TABLE public.retribution_bills DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

-- Hanya tagihan AKTIF yang unik; tagihan DIBATALKAN tidak menghalangi
-- penerbitan ulang periode yang sama.
CREATE UNIQUE INDEX IF NOT EXISTS retribution_bills_period_unique
  ON public.retribution_bills (stall_id, types_id, period_start, period_end)
  WHERE status = 'AKTIF';

CREATE INDEX IF NOT EXISTS idx_retribution_bills_period
  ON public.retribution_bills (market_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_retribution_bills_stall_type_period
  ON public.retribution_bills (stall_id, types_id, period_start);

-- ---------------------------------------------------------------------------
-- 1b) Guard periode tagihan: period_year selalu dari period_start, dan
--     rentang untuk lapak+jenis yang sama tidak boleh tumpang tindih.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_retribution_bill_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.period_start IS NULL OR NEW.period_end IS NULL THEN
    RAISE EXCEPTION 'Periode tagihan wajib diisi';
  END IF;

  IF NEW.period_end < NEW.period_start THEN
    RAISE EXCEPTION 'Tanggal akhir periode tidak boleh sebelum tanggal mulai';
  END IF;

  NEW.period_year := extract(year FROM NEW.period_start)::integer;

  -- Tagihan yang dibatalkan tidak menghalangi periode baru.
  IF NEW.status = 'DIBATALKAN' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.retribution_bills b
    WHERE b.stall_id = NEW.stall_id
      AND b.types_id = NEW.types_id
      AND b.status = 'AKTIF'
      AND b.id IS DISTINCT FROM NEW.id
      AND daterange(b.period_start, b.period_end, '[]')
          && daterange(NEW.period_start, NEW.period_end, '[]')
  ) THEN
    RAISE EXCEPTION 'Periode tagihan tumpang tindih untuk lapak/jenis yang sama';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_retribution_bill_period ON public.retribution_bills;
CREATE TRIGGER trg_guard_retribution_bill_period
BEFORE INSERT OR UPDATE ON public.retribution_bills
FOR EACH ROW
EXECUTE FUNCTION public.guard_retribution_bill_period();

-- ---------------------------------------------------------------------------
-- 2) Tarif: irama penagihan per lapak
-- ---------------------------------------------------------------------------
ALTER TABLE public.retribution_rates
  ADD COLUMN IF NOT EXISTS collection_period text,
  ADD COLUMN IF NOT EXISTS collection_anchor smallint;

-- Backfill dari satuan jenis retribusi.
UPDATE public.retribution_rates r
SET collection_period = t.billing_period
FROM public.retribution_types t
WHERE t.id = r.types_id
  AND r.collection_period IS NULL;

-- Jaring pengaman: kolom wajib terisi sebelum SET NOT NULL.
UPDATE public.retribution_rates
SET collection_period = 'HARIAN'
WHERE collection_period IS NULL;

-- Mingguan default Senin (ISO 1), bulanan default tanggal 1.
UPDATE public.retribution_rates
SET collection_anchor = 1
WHERE collection_period IN ('MINGGUAN', 'BULANAN')
  AND collection_anchor IS NULL;

ALTER TABLE public.retribution_rates
  ALTER COLUMN collection_period SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retribution_rates_collection_period_check'
      AND conrelid = 'public.retribution_rates'::regclass
  ) THEN
    ALTER TABLE public.retribution_rates
      ADD CONSTRAINT retribution_rates_collection_period_check
      CHECK (collection_period IN ('HARIAN', 'MINGGUAN', 'BULANAN', 'TAHUNAN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retribution_rates_collection_anchor_check'
      AND conrelid = 'public.retribution_rates'::regclass
  ) THEN
    ALTER TABLE public.retribution_rates
      ADD CONSTRAINT retribution_rates_collection_anchor_check
      CHECK (
        collection_anchor IS NULL
        OR (
          collection_anchor BETWEEN 1 AND 31
          AND (collection_period <> 'MINGGUAN' OR collection_anchor BETWEEN 1 AND 7)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retribution_rates_collection_anchor_required_check'
      AND conrelid = 'public.retribution_rates'::regclass
  ) THEN
    ALTER TABLE public.retribution_rates
      ADD CONSTRAINT retribution_rates_collection_anchor_required_check
      CHECK (collection_period NOT IN ('MINGGUAN', 'BULANAN') OR collection_anchor IS NOT NULL);
  END IF;
END $$;

-- Tarif baru tanpa collection_period mewarisi irama tarif terakhir lapak+jenis;
-- bila belum ada, ikut satuan jenis. Anchor ikut diwariskan.
CREATE OR REPLACE FUNCTION public.set_rate_collection_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_anchor smallint;
BEGIN
  v_period := NULL;
  v_anchor := NULL;

  IF NEW.collection_period IS NULL THEN
    SELECT r.collection_period
    INTO v_period
    FROM public.retribution_rates r
    WHERE r.stall_id = NEW.stall_id
      AND r.types_id = NEW.types_id
      AND r.id IS DISTINCT FROM NEW.id
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT 1;

    IF v_period IS NULL THEN
      SELECT t.billing_period
      INTO v_period
      FROM public.retribution_types t
      WHERE t.id = NEW.types_id;
    END IF;

    NEW.collection_period := v_period;
  END IF;

  NEW.collection_period := coalesce(NEW.collection_period, 'HARIAN');

  IF NEW.collection_period IN ('MINGGUAN', 'BULANAN') AND NEW.collection_anchor IS NULL THEN
    SELECT r.collection_anchor
    INTO v_anchor
    FROM public.retribution_rates r
    WHERE r.stall_id = NEW.stall_id
      AND r.types_id = NEW.types_id
      AND r.id IS DISTINCT FROM NEW.id
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT 1;

    NEW.collection_anchor := v_anchor;
  END IF;

  IF NEW.collection_period = 'MINGGUAN' THEN
    IF NEW.collection_anchor IS NULL OR NEW.collection_anchor NOT BETWEEN 1 AND 7 THEN
      NEW.collection_anchor := 1;
    END IF;
  ELSIF NEW.collection_period = 'BULANAN' THEN
    IF NEW.collection_anchor IS NULL OR NEW.collection_anchor NOT BETWEEN 1 AND 31 THEN
      NEW.collection_anchor := 1;
    END IF;
  ELSE
    NEW.collection_anchor := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_rate_collection_period ON public.retribution_rates;
CREATE TRIGGER trg_set_rate_collection_period
BEFORE INSERT OR UPDATE OF types_id, collection_period, collection_anchor
ON public.retribution_rates
FOR EACH ROW
EXECUTE FUNCTION public.set_rate_collection_period();

-- ---------------------------------------------------------------------------
-- 3) View saldo: tambah kolom periode
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.retribution_bill_balances
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.market_id,
  b.stall_id,
  b.types_id,
  b.period_year,
  b.amount_due,
  b.due_date,
  b.note,
  coalesce(p.paid, 0)::numeric(15,2) AS amount_paid,
  (b.amount_due - coalesce(p.paid, 0))::numeric(15,2) AS outstanding,
  CASE
    WHEN b.status = 'DIBATALKAN' THEN 'DIBATALKAN'
    WHEN coalesce(p.paid, 0) >= b.amount_due THEN 'LUNAS'
    WHEN coalesce(p.paid, 0) > 0 THEN 'CICILAN'
    ELSE 'BELUM_LUNAS'
  END AS status,
  (b.status = 'AKTIF' AND coalesce(p.paid, 0) < b.amount_due) AS is_open,
  b.period_kind,
  b.period_start,
  b.period_end
FROM public.retribution_bills b
LEFT JOIN (
  SELECT t.bill_id, sum(t.amount) AS paid
  FROM public.transactions t
  WHERE t.bill_id IS NOT NULL
    AND public.is_paid_transaction_status(t.status)
  GROUP BY t.bill_id
) p ON p.bill_id = b.id;

-- ---------------------------------------------------------------------------
-- 4) Terbitkan tagihan tahunan (period_year + periode penuh setahun)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_retribution_bills(
  p_market_id bigint,
  p_year integer,
  p_types_id bigint DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
  v_start date;
  v_end date;
BEGIN
  IF NOT (public.is_current_user_admin_full() OR public.is_current_user_market_member(p_market_id)) THEN
    RAISE EXCEPTION 'Tidak berwenang menerbitkan tagihan pasar ini';
  END IF;

  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Tahun tagihan tidak valid';
  END IF;

  v_start := make_date(p_year, 1, 1);
  v_end := make_date(p_year, 12, 31);

  WITH latest_rate AS (
    SELECT DISTINCT ON (r.stall_id, r.types_id)
           r.market_id, r.stall_id, r.types_id, r.amount
    FROM public.retribution_rates r
    WHERE r.market_id = p_market_id
      AND r.stall_id IS NOT NULL
      AND r.amount > 0
    ORDER BY r.stall_id, r.types_id, r.created_at DESC, r.id DESC
  )
  INSERT INTO public.retribution_bills (
    market_id, stall_id, types_id, period_year, amount_due, due_date, note,
    period_kind, period_start, period_end
  )
  SELECT lr.market_id, lr.stall_id, lr.types_id, p_year, lr.amount,
         coalesce(p_due_date, make_date(p_year, 3, 31)),
         'Tagihan tahunan ' || p_year,
         'TAHUNAN', v_start, v_end
  FROM latest_rate lr
  JOIN public.stalls s ON s.id = lr.stall_id
  JOIN public.retribution_types t ON t.id = lr.types_id
  WHERE s.status = 'AKTIF'
    AND t.billing_period = 'TAHUNAN'
    AND (p_types_id IS NULL OR lr.types_id = p_types_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.retribution_bills b
      WHERE b.stall_id = lr.stall_id
        AND b.types_id = lr.types_id
        AND b.status = 'AKTIF'
        AND daterange(b.period_start, b.period_end, '[]')
            && daterange(v_start, v_end, '[]')
    )
  ON CONFLICT (stall_id, types_id, period_start, period_end)
    WHERE status = 'AKTIF' DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Pembayaran tagihan FIFO berdasarkan periode terlama
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_retribution_bills(
  p_stall_id bigint,
  p_amount numeric,
  p_types_id bigint DEFAULT NULL,
  p_payment_method text DEFAULT 'Tunai',
  p_payer_name text DEFAULT NULL,
  p_note text DEFAULT NULL
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
      payment_method, payer_name, status, source, sync_status, note
    ) VALUES (
      bill.market_id, bill.stall_id, bill_rate_id, bill.id, bill.period_year, applied,
      coalesce(p_payment_method, 'Tunai'), p_payer_name, 'paid', 'TAGIHAN', 'SYNCED', p_note
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

-- ---------------------------------------------------------------------------
-- 6) Terbitkan tagihan untuk satu rentang tanggal
--    Nominal dihitung dari satuan jenis (HARIAN/MINGGUAN/BULANAN), bukan dari
--    irama penagihan. Maksimal 31 hari agar tidak dipakai menggantikan tagihan
--    tahunan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_period_bills(
  p_market_id bigint,
  p_types_id bigint,
  p_period_start date,
  p_period_end date,
  p_stall_id bigint DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_period_kind text DEFAULT 'CUSTOM'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_type_period text;
  v_period_kind text;
  v_inserted integer;
BEGIN
  IF NOT (public.is_current_user_admin_full() OR public.is_current_user_market_member(p_market_id)) THEN
    RAISE EXCEPTION 'Tidak berwenang menerbitkan tagihan pasar ini';
  END IF;

  IF p_market_id IS NULL OR p_types_id IS NULL THEN
    RAISE EXCEPTION 'Pasar dan jenis retribusi wajib diisi';
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'Tanggal periode wajib diisi';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Tanggal akhir periode tidak boleh sebelum tanggal mulai';
  END IF;

  v_period_kind := coalesce(p_period_kind, 'CUSTOM');
  IF v_period_kind NOT IN ('HARIAN', 'MINGGUAN', 'BULANAN', 'CUSTOM') THEN
    RAISE EXCEPTION 'Jenis periode tidak valid: %', v_period_kind;
  END IF;

  v_days := (p_period_end - p_period_start) + 1;
  IF v_days > 31 THEN
    RAISE EXCEPTION 'Periode maksimal 31 hari (diminta %)', v_days;
  END IF;

  IF p_stall_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.stalls s
    WHERE s.id = p_stall_id AND s.market_id = p_market_id
  ) THEN
    RAISE EXCEPTION 'Lapak % bukan milik pasar %', p_stall_id, p_market_id;
  END IF;

  SELECT t.billing_period INTO v_type_period
  FROM public.retribution_types t
  WHERE t.id = p_types_id;

  IF v_type_period IS NULL THEN
    RAISE EXCEPTION 'Jenis retribusi % tidak ditemukan', p_types_id;
  END IF;

  IF v_type_period = 'TAHUNAN' THEN
    RAISE EXCEPTION 'Gunakan generate_retribution_bills untuk jenis tahunan';
  END IF;

  WITH latest_rate AS (
    SELECT DISTINCT ON (r.stall_id, r.types_id)
           r.market_id, r.stall_id, r.types_id, r.amount
    FROM public.retribution_rates r
    WHERE r.market_id = p_market_id
      AND r.types_id = p_types_id
      AND r.stall_id IS NOT NULL
    ORDER BY r.stall_id, r.types_id, r.created_at DESC, r.id DESC
  )
  INSERT INTO public.retribution_bills (
    market_id, stall_id, types_id, period_year, amount_due, due_date, note,
    period_kind, period_start, period_end
  )
  SELECT lr.market_id,
         lr.stall_id,
         lr.types_id,
         extract(year FROM p_period_start)::integer,
         round(
           CASE v_type_period
             WHEN 'MINGGUAN' THEN lr.amount * v_days / 7.0
             WHEN 'BULANAN' THEN lr.amount * v_days / 30.0
             ELSE lr.amount * v_days
           END,
           2
         ),
         coalesce(p_due_date, p_period_end),
         coalesce(
           p_note,
           'Periode ' || to_char(p_period_start, 'YYYY-MM-DD')
             || ' s/d ' || to_char(p_period_end, 'YYYY-MM-DD')
         ),
         v_period_kind,
         p_period_start,
         p_period_end
  FROM latest_rate lr
  JOIN public.stalls s ON s.id = lr.stall_id
  WHERE lr.amount > 0
    AND s.status = 'AKTIF'
    AND (p_stall_id IS NULL OR lr.stall_id = p_stall_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.retribution_bills b
      WHERE b.stall_id = lr.stall_id
        AND b.types_id = lr.types_id
        AND b.status = 'AKTIF'
        AND daterange(b.period_start, b.period_end, '[]')
            && daterange(p_period_start, p_period_end, '[]')
    )
  ON CONFLICT (stall_id, types_id, period_start, period_end)
    WHERE status = 'AKTIF' DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Pastikan tagihan periode berjalan ada (dipanggil saat petugas membuka
--    lapak). Kembalikan id tagihan, atau NULL untuk irama HARIAN/TAHUNAN.
--    Batas hari memakai WITA (Asia/Makassar), sama dengan halaman pemilik.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_current_period_bill(
  p_stall_id bigint,
  p_types_id bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_id bigint;
  v_amount numeric;
  v_collection text;
  v_anchor integer;
  v_today date;
  v_start date;
  v_end date;
  v_dow integer;
  v_month_start date;
  v_prev_month date;
  v_next_month date;
  v_anchor_clamped integer;
  v_bill_id bigint;
BEGIN
  SELECT s.market_id INTO v_market_id
  FROM public.stalls s
  WHERE s.id = p_stall_id;

  IF v_market_id IS NULL THEN
    RAISE EXCEPTION 'Lapak % tidak ditemukan', p_stall_id;
  END IF;

  IF NOT (public.is_current_user_admin_full() OR public.is_current_user_market_member(v_market_id)) THEN
    RAISE EXCEPTION 'Tidak berwenang mengakses tagihan pasar ini';
  END IF;

  SELECT r.amount, r.collection_period, coalesce(r.collection_anchor, 1)
  INTO v_amount, v_collection, v_anchor
  FROM public.retribution_rates r
  WHERE r.stall_id = p_stall_id
    AND r.types_id = p_types_id
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT 1;

  IF NOT FOUND OR v_amount IS NULL OR v_amount <= 0 THEN
    RETURN NULL;
  END IF;

  IF v_collection IS NULL OR v_collection NOT IN ('MINGGUAN', 'BULANAN') THEN
    RETURN NULL;
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Makassar')::date;

  IF v_collection = 'MINGGUAN' THEN
    v_anchor := least(greatest(coalesce(v_anchor, 1), 1), 7);
    v_dow := extract(isodow FROM v_today)::integer;
    v_start := v_today - ((v_dow - v_anchor + 7) % 7);
    v_end := v_start + 6;
  ELSE
    v_anchor := least(greatest(coalesce(v_anchor, 1), 1), 31);
    v_month_start := date_trunc('month', v_today)::date;

    v_anchor_clamped := least(
      v_anchor,
      extract(day FROM (date_trunc('month', v_today) + interval '1 month - 1 day'))::integer
    );
    v_start := v_month_start + (v_anchor_clamped - 1);

    IF v_today < v_start THEN
      v_prev_month := (v_month_start - interval '1 month')::date;
      v_anchor_clamped := least(
        v_anchor,
        extract(day FROM (date_trunc('month', v_prev_month) + interval '1 month - 1 day'))::integer
      );
      v_start := v_prev_month + (v_anchor_clamped - 1);
    END IF;

    v_next_month := (date_trunc('month', v_start) + interval '1 month')::date;
    v_anchor_clamped := least(
      v_anchor,
      extract(day FROM (date_trunc('month', v_next_month) + interval '1 month - 1 day'))::integer
    );
    v_end := (v_next_month + (v_anchor_clamped - 1)) - 1;
  END IF;

  PERFORM public.generate_period_bills(
    v_market_id,
    p_types_id,
    v_start,
    v_end,
    p_stall_id,
    v_end,
    NULL,
    v_collection
  );

  SELECT b.id INTO v_bill_id
  FROM public.retribution_bills b
  WHERE b.stall_id = p_stall_id
    AND b.types_id = p_types_id
    AND b.period_start = v_start
    AND b.period_end = v_end
    AND b.status = 'AKTIF'
  ORDER BY b.id DESC
  LIMIT 1;

  RETURN v_bill_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Hak akses
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.generate_period_bills(bigint, bigint, date, date, bigint, date, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_period_bills(bigint, bigint, date, date, bigint, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_period_bills(bigint, bigint, date, date, bigint, date, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_current_period_bill(bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_current_period_bill(bigint, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_period_bill(bigint, bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_retribution_bills(bigint, integer, bigint, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_retribution_bills(bigint, integer, bigint, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_retribution_bills(bigint, integer, bigint, date) TO authenticated;

REVOKE ALL ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_retribution_bills(bigint, numeric, bigint, text, text, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFIKASI (jalankan setelah COMMIT)
-- ============================================================================
-- 1) Kolom periode tagihan:
--      SELECT column_name, data_type, is_nullable, column_default
--      FROM information_schema.columns
--      WHERE table_schema = 'public' AND table_name = 'retribution_bills'
--        AND column_name IN ('period_kind', 'period_start', 'period_end')
--      ORDER BY column_name;
-- 2) Backfill tagihan lama:
--      SELECT count(*) AS total,
--             count(*) FILTER (WHERE period_kind = 'TAHUNAN') AS tahunan,
--             min(period_start) AS mulai, max(period_end) AS selesai
--      FROM public.retribution_bills;
-- 3) Unique & index:
--      SELECT indexname, indexdef FROM pg_indexes
--      WHERE schemaname = 'public' AND tablename = 'retribution_bills'
--      ORDER BY indexname;
-- 4) Kolom irama penagihan:
--      SELECT column_name, data_type, is_nullable, column_default
--      FROM information_schema.columns
--      WHERE table_schema = 'public' AND table_name = 'retribution_rates'
--        AND column_name IN ('collection_period', 'collection_anchor');
--      SELECT collection_period, count(*) FROM public.retribution_rates
--      GROUP BY collection_period ORDER BY 1;
-- 5) Trigger:
--      SELECT tgname FROM pg_trigger
--      WHERE tgrelid = 'public.retribution_bills'::regclass AND NOT tgisinternal;
--      SELECT tgname FROM pg_trigger
--      WHERE tgrelid = 'public.retribution_rates'::regclass AND NOT tgisinternal;
-- 6) View:
--      SELECT id, stall_id, types_id, period_kind, period_start, period_end,
--             amount_due, amount_paid, outstanding, status
--      FROM public.retribution_bill_balances
--      ORDER BY period_start DESC LIMIT 10;
-- 7) Uji terbitkan satu minggu (pilih jenis & lapak nyata lebih dulu):
--      SELECT public.generate_period_bills(39, <types_id>,
--               date '2026-10-26', date '2026-11-01', <stall_id>,
--               date '2026-11-01', NULL, 'MINGGUAN');
--      SELECT public.ensure_current_period_bill(<stall_id>, <types_id>);
-- 8) Uji overlap ditolak:
--      SELECT public.generate_period_bills(39, <types_id>,
--               date '2026-10-28', date '2026-11-03', <stall_id>,
--               date '2026-11-03', NULL, 'CUSTOM');
--      -> harus mengembalikan 0 (bukan error), karena rentang bertumpuk dilewati.
--
-- CATATAN OPERASIONAL:
-- - Setelah migration, semua tarif lama mewarisi irama dari satuan jenis
--   (HARIAN tetap HARIAN). Untuk lapak yang bayar mingguan, ubah tarifnya:
--      UPDATE public.retribution_rates
--      SET collection_period = 'MINGGUAN', collection_anchor = 1
--      WHERE types_id = <types_id> AND stall_id = <stall_id>;
--   (lakukan lewat UI Tarif setelah UI diperbarui, atau SQL terkontrol)
-- - Tagihan mingguan/bulanan dibuat lazy saat petugas membuka lapak
--   (ensure_current_period_bill). Bila perlu dibuat massal, panggil
--   generate_period_bills dengan p_stall_id NULL.
-- - ensure_current_period_bill hanya memastikan periode berjalan. Bila
--   petugas melewatkan periode, terbitkan periode yang terlewat dengan
--   generate_period_bills (satu rentang per periode) sebelum membayar.
--   Tunggakan = semua tagihan AKTIF dengan is_open = true.
-- ============================================================================
