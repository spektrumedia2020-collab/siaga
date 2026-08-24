-- ============================================================================
-- MIGRASI KOLOM transactions.total_amount -> transactions.amount (item 2.4)
-- ============================================================================
-- LATAR BELAKANG:
--   Sebelumnya terjadi bentrok skema: kode lama menulis ke `total_amount`,
--   kode baru (setelah audit 23 Agu 2026) konsisten memakai `amount`.
--   File ini menyelesaikan migrasi di production dengan aman.
--
-- CATATAN PENTING:
--   - JANGAN sentuh tabel `setoran`: kolom `setoran.total_amount` itu BENAR
--     (total setoran harian) dan TIDAK berkaitan dengan kolom transactions.
--   - Jalankan SELURUH isi file ini SATU KALI di Supabase Dashboard > SQL Editor.
--   - Verifikasi dulu sebelum drop (lihat blok VERIFIKASI di akhir).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- LANGKAH 1: Pastikan kolom `amount` ada di tabel transactions
--            (kalau belum, tambahkan menerima data lama)
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2);

-- ---------------------------------------------------------------------------
-- LANGKAH 2: Backfill data lama (jika transactions masih punya total_amount)
--
--   Hanya mengisi `amount` yang masih NULL/0 dari `total_amount` yang punya nilai.
--   Aman dijalankan berulang (idempoten); tidak menimpa data baru yang valid.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'total_amount'
  ) THEN
    UPDATE public.transactions
    SET amount = total_amount
    WHERE (amount IS NULL OR amount = 0)
      AND total_amount IS NOT NULL
      AND total_amount <> 0;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- LANGKAH 3: Hapus kolom usang `total_amount` (hanya jika masih ada)
--
--   PJM: Pastikan LANGKAH 2 sudah jalan & jumlah data cocok sebelum drop.
--   Untuk berjaga-jaga, kolom ini hanya di-drop jika bernilai NULL seluruhnya
--   ATAU setelah Anda memverifikasi secara manual. Hapus komentar blok berikut
--   bila ingin langsung drop.
-- ---------------------------------------------------------------------------

-- Hapus baris berikut untuk AKTIFKAN drop (default: non-destruktif):
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_schema = 'public'
--       AND table_name = 'transactions'
--       AND column_name = 'total_amount'
--   ) THEN
--     ALTER TABLE public.transactions DROP COLUMN IF EXISTS total_amount;
--   END IF;
-- END $$;

-- ---------------------------------------------------------------------------
-- LANGKAH 4: Tidak boleh ada NULL pada amount untuk data transaksi lama
-- ---------------------------------------------------------------------------
UPDATE public.transactions
SET amount = 0
WHERE amount IS NULL;

-- ============================================================================
-- VERIFIKASI (jalankan SETELAH migrasi, di SQL Editor / Supabase Table Editor)
-- ============================================================================
-- 1) Pastikan kolom amount terisi:
--      SELECT COUNT(*) AS total_rows,
--             COUNT(amount) AS with_amount,
--             COALESCE(SUM(amount),0) AS total_sum
--      FROM public.transactions;
--
-- 2) Cek sisa NULL/0 yang belum kebackfill:
--      SELECT * FROM public.transactions
--      WHERE (amount IS NULL OR amount = 0)
--      LIMIT 20;
--
-- 3) Cek apakah kolom total_amount masih ada (harusnya TIDAK setelah drop):
--      SELECT column_name
--      FROM information_schema.columns
--      WHERE table_schema = 'public'
--        AND table_name = 'transactions'
--        AND column_name IN ('amount', 'total_amount');
-- ============================================================================