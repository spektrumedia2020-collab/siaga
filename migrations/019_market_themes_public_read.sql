-- ============================================================================
-- 019_market_themes_public_read.sql
--
-- Halaman publik `/@<slug>` dibaca sebagai `anon`, sedangkan policy SELECT pada
-- `market_themes` hanya diberikan ke `authenticated`. Akibatnya tema kustom
-- buatan admin tidak pernah sampai ke halaman publik (frontend jatuh ke preset
-- lokal bawaan). Policy ini hanya membuka warna tema — tidak ada data sensitif.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "market_themes_select_anon" ON public.market_themes;

CREATE POLICY "market_themes_select_anon"
ON public.market_themes FOR SELECT TO anon
USING (true);

COMMIT;
