-- ============================================
-- Auto daily setoran generator
-- ============================================
-- Tujuan:
--   1) ambil transaksi dengan status = 'paid'
--   2) mapping transactions.officer_id (id_user integer) -> users.auth_uid (uuid)
--   3) grouping per pasar, petugas, dan tanggal
--   4) insert 1 setoran per petugas per hari ke public.setoran
--
-- Catatan:
--   - file ini TIDAK menyentuh kode Flutter
--   - cocok untuk dijalankan sebagai job harian di Supabase
--   - query bersifat idempotent: tidak membuat duplikat untuk hari yang sama
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_daily_setoran(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(inserted_count INTEGER, generated_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT
      t.market_id,
      u.auth_uid AS officer_id,
      p_date AS setoran_date,
      SUM(t.amount)::numeric(15,2) AS total_amount,
      COUNT(*)::int AS transaction_count
    FROM public.transactions t
    JOIN public.users u
      ON u.id_user = t.officer_id
    JOIN public.markets m
      ON m.id = t.market_id
    WHERE t.status = 'paid'
      AND t.officer_id IS NOT NULL
      AND t.market_id IS NOT NULL
      AND u.auth_uid IS NOT NULL
      AND m.status = 'AKTIF'
      AND COALESCE(t.transaction_date::date, t.created_at::date) = p_date
    GROUP BY
      t.market_id,
      u.auth_uid
  ),
  inserted AS (
    INSERT INTO public.setoran (
      officer_id,
      market_id,
      total_amount,
      transaction_count,
      note,
      status
    )
    SELECT
      c.officer_id,
      c.market_id,
      c.total_amount,
      c.transaction_count,
      'Auto-generated dari transaksi paid ' || c.setoran_date::text,
      'pending_treasurer'
    FROM candidate c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.setoran s
      WHERE s.officer_id = c.officer_id
        AND s.market_id = c.market_id
        AND s.created_at::date = c.setoran_date
    )
    RETURNING 1
  )
  SELECT
    COALESCE((SELECT COUNT(*)::int FROM inserted), 0),
    p_date;
END;
$$;

-- ============================================
-- Cara pakai:
-- ============================================
--
-- 1) Jalankan untuk hari ini (otomatis per hari):
-- SELECT public.generate_daily_setoran(CURRENT_DATE);
--
-- 2) Jalankan untuk tanggal tertentu:
-- SELECT public.generate_daily_setoran('2026-09-09');
--
-- 3) Jika ingin dijadwalkan otomatis dengan pg_cron:
-- SELECT cron.schedule(
--   'daily-setoran',
--   '0 1 * * *',
--   $$SELECT public.generate_daily_setoran(CURRENT_DATE);$$
-- );
--
-- Catatan:
--   - pg_cron harus sudah aktif di database
--   - query ini akan mencegah duplikat pada hari yang sama
-- ============================================
