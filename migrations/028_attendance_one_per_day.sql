-- ============================================================================
-- 028_attendance_one_per_day.sql
--
-- Satu petugas hanya boleh punya SATU baris absensi per hari (zona WITA).
--
-- Cara kerja:
--   - attendance_date diisi otomatis oleh trigger dari check_in (Asia/Makassar).
--   - unique index (officer_id, attendance_date) menolak check-in kedua.
--   - kolom dibuat terpisah karena expression index dengan AT TIME ZONE tidak
--     dianggap IMMUTABLE oleh PostgreSQL.
--
-- PRASYARAT: tidak boleh ada absensi ganda yang sudah tersimpan. Bila ada,
-- migrasi berhenti dan menyebutkan id yang harus dihapus lebih dulu.
-- Idempoten. Jalankan di Supabase SQL Editor setelah 027.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.attendance') IS NULL THEN
    RAISE EXCEPTION 'Tabel public.attendance tidak ditemukan. Periksa koneksi SQL Editor (proyek siaga.app, ref hlvsbmxpkqvniemunygh).';
  END IF;
END $$;

DO $$
DECLARE
  dup record;
BEGIN
  SELECT officer_id,
         (check_in AT TIME ZONE 'Asia/Makassar')::date AS attendance_date,
         count(*) AS jumlah,
         string_agg(id::text, ', ' ORDER BY id) AS ids
  INTO dup
  FROM public.attendance
  WHERE check_in IS NOT NULL
  GROUP BY 1, 2
  HAVING count(*) > 1
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Absensi ganda ditemukan: petugas %, tanggal %, id [%]. Hapus duplikat terlebih dahulu lalu jalankan ulang migrasi ini.',
      dup.officer_id, dup.attendance_date, dup.ids;
  END IF;
END $$;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS attendance_date date;

UPDATE public.attendance
SET attendance_date = (check_in AT TIME ZONE 'Asia/Makassar')::date
WHERE attendance_date IS NULL
  AND check_in IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_attendance_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.check_in IS NOT NULL THEN
    NEW.attendance_date := (NEW.check_in AT TIME ZONE 'Asia/Makassar')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_attendance_date ON public.attendance;
CREATE TRIGGER trg_set_attendance_date
  BEFORE INSERT OR UPDATE OF check_in ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_attendance_date();

CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_per_day
  ON public.attendance (officer_id, attendance_date);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikasi:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='attendance' AND column_name='attendance_date';
--
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname='public' AND tablename='attendance' AND indexname='attendance_one_per_day';
--
-- SELECT id, officer_id, check_in, attendance_date FROM public.attendance ORDER BY id DESC LIMIT 5;

-- Uji (rollback): check-in kedua pada hari yang sama harus ditolak.
-- BEGIN;
--   INSERT INTO public.attendance (officer_id, officer_name, market_id, check_in, status)
--   VALUES ('49e14982-961e-494f-bcda-bbd3d20c5a2c', 'Uji', 39, now(), 'present');
--   INSERT INTO public.attendance (officer_id, officer_name, market_id, check_in, status)
--   VALUES ('49e14982-961e-494f-bcda-bbd3d20c5a2c', 'Uji', 39, now(), 'present');
-- ROLLBACK;
