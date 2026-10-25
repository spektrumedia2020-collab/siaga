-- ============================================================================
-- 016_stalls_public_token.sql
--
-- Fase 1 akses publik lapak: ganti PIN dengan token acak per lapak.
-- QR publik berisi URL `/lapak/<public_token>`; aplikasi petugas tetap memakai
-- kode lapak sampai rilis mobile berikutnya.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.stalls
  ADD COLUMN IF NOT EXISTS public_token text;

UPDATE public.stalls
   SET public_token = replace(gen_random_uuid()::text, '-', '')
 WHERE public_token IS NULL;

ALTER TABLE public.stalls
  ALTER COLUMN public_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');

ALTER TABLE public.stalls
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stalls_public_token
  ON public.stalls (public_token);

SELECT
  count(*) AS total_stalls,
  count(public_token) AS with_token,
  count(DISTINCT public_token) AS distinct_tokens
FROM public.stalls;

COMMIT;
