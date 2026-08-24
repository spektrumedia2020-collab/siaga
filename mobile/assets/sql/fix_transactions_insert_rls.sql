-- ============================================================================
-- FIX TRANSACTIONS INSERT SECURITY (v3 - trigger-based)
-- Sprint 1, Item 1.2 & 1.3 (TODO_FIXES.md)
-- Tanggal: 23 Agustus 2026
--
-- RIWAYAT MASALAH:
--   v1 & v2 gagal dengan: ERROR 42P01: missing FROM-clause entry for table "new"
--   Parser SQL Editor Supabase Anda gagal memproses referensi NEW.* di dalam
--   ekspresi CREATE POLICY (meski sudah di level atas).
--
-- SOLUSI v3 (definitif):
--   - Policy RLS dibuat SEDERHANA (tanpa referensi NEW sama sekali)
--   - Validasi bisnis dipindahkan ke TRIGGER BEFORE INSERT
--     (dalam PL/pgSQL trigger function, NEW selalu valid)
--   - Hasil keamanan identik: petugas hanya bisa insert transaksi
--     untuk market-nya sendiri; admin bebas; anonim ditolak.
--
-- CARA MENJALANKAN:
--   1. Buka Supabase Dashboard > SQL Editor
--   2. Paste seluruh isi file ini
--   3. Run
--   4. Test mobile: login petugas -> buat transaksi market sendiri = BERHASIL,
--      coba paksa market lain = GAGAL dengan pesan jelas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- LANGKAH 0: Pastikan RLS aktif
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- LANGKAH 1: Fungsi helper (aman, tanpa NEW)
-- ---------------------------------------------------------------------------

-- Market tempat user yang sedang login bertugas
CREATE OR REPLACE FUNCTION public.get_current_user_market_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT market_id
  FROM public.users
  WHERE auth_uid = auth.uid()
  LIMIT 1;
$$;

-- Cek apakah user yang sedang login adalah ADMIN
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.id_role
    WHERE u.auth_uid = auth.uid()
      AND UPPER(r.name) = 'ADMIN'
  );
$$;

-- ---------------------------------------------------------------------------
-- LANGKAH 2: Hapus policy lama (permisif maupun versi gagal)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "officers_can_insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_can_insert_transactions" ON public.transactions;

-- ---------------------------------------------------------------------------
-- LANGKAH 3: Policy INSERT sederhana (tanpa NEW -> tidak akan error parsing)
--
--   - anon            : ditolak (policy hanya untuk authenticated)
--   - authenticated   : lolos gate RLS, validasi detail oleh trigger di bawah
--   - service role    : bypass RLS (backend Express tetap berfungsi normal)
-- ---------------------------------------------------------------------------
CREATE POLICY "authenticated_can_insert_transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- LANGKAH 4: Trigger validasi market (NEW 100% valid di sini)
-- ---------------------------------------------------------------------------

-- Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS trg_validate_transaction_market ON public.transactions;

CREATE OR REPLACE FUNCTION public.validate_transaction_market()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx_market BIGINT;
BEGIN
  -- Service role / backend server-side (tanpa JWT user): izinkan
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admin: bebas lintas pasar
  IF public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  -- Tentukan market transaksi yang akan dibuat
  IF NEW.market_id IS NOT NULL THEN
    tx_market := NEW.market_id;
  ELSIF NEW.stall_id IS NOT NULL THEN
    SELECT market_id INTO tx_market
    FROM public.stalls
    WHERE id = NEW.stall_id;
  END IF;

  -- Validasi: harus sama dengan market petugas
  IF tx_market IS NULL OR tx_market <> public.get_current_user_market_id() THEN
    RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat membuat transaksi untuk pasar tempat Anda bertugas'
      USING ERRCODE = '42501'; -- insufficient_privilege (meniru pelanggaran RLS)
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_transaction_market
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_transaction_market();

-- ---------------------------------------------------------------------------
-- CATATAN KEAMANAN TAMBAHAN (opsional - jalankan setelah review tim):
--
-- Policy SELECT & UPDATE existing masih USING (true). Setelah dashboard web
-- dikonfirmasi aman, perketat dengan versi scoped (tanpa NEW, aman):
--
-- DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
-- CREATE POLICY "transactions_select_scoped"
-- ON public.transactions FOR SELECT TO authenticated
-- USING (
--   public.is_current_user_admin()
--   OR transactions.market_id = public.get_current_user_market_id()
-- );
--
-- DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
-- CREATE POLICY "transactions_update_scoped"
-- ON public.transactions FOR UPDATE TO authenticated
-- USING (
--   public.is_current_user_admin()
--   OR transactions.market_id = public.get_current_user_market_id()
-- );
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- VERIFIKASI (jalankan terpisah):
--
-- 1. Lihat policy aktif:
--    SELECT policyname, cmd, with_check FROM pg_policies
--    WHERE tablename = 'transactions';
--
-- 2. Lihat trigger aktif:
--    SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.transactions'::regclass;
--
-- 3. Test helper (harus mengembalikan market_id akun Anda):
--    SELECT public.get_current_user_market_id(), public.is_current_user_admin();
-- ---------------------------------------------------------------------------