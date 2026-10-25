-- ============================================================================
-- 017_market_themes_and_retribution_write.sql
--
-- 1) Tabel `market_themes` yang dirujuk `ThemeManagement.tsx` tetapi belum ada.
-- 2) Kolom `markets.theme_id` untuk menerapkan tema ke pasar.
-- 3) Policy UPDATE/DELETE `retribution_types` (sebelumnya tidak ada → edit/hapus ditolak).
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.market_themes (
  id text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  name text NOT NULL,
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  accent_color text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_themes_select" ON public.market_themes;
DROP POLICY IF EXISTS "market_themes_insert_admin" ON public.market_themes;
DROP POLICY IF EXISTS "market_themes_update_admin" ON public.market_themes;
DROP POLICY IF EXISTS "market_themes_delete_admin" ON public.market_themes;

CREATE POLICY "market_themes_select"
ON public.market_themes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "market_themes_insert_admin"
ON public.market_themes FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "market_themes_update_admin"
ON public.market_themes FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "market_themes_delete_admin"
ON public.market_themes FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

-- Seed 4 tema bawaan (id stabil agar `markets.theme_id` lama tetap valid)
INSERT INTO public.market_themes (id, name, primary_color, secondary_color, accent_color, description, is_active)
VALUES
  ('default', 'Hijau (Default)', '#1f7a1f', '#3d5224', '#f4c300', 'Tema hijau klasik untuk semua pasar', true),
  ('ocean',   'Biru Laut',       '#0ea5e9', '#0284c7', '#06b6d4', 'Tema biru yang menenangkan',       false),
  ('sunset',  'Sunset Orange',   '#ea580c', '#c2410c', '#f97316', 'Tema oranye cerah',                false),
  ('purple',  'Ungu Royal',      '#7c3aed', '#6d28d9', '#a855f7', 'Tema ungu elegan',                 false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS theme_id text REFERENCES public.market_themes(id) ON DELETE SET NULL;

-- Retribution types: izinkan ADMIN mengubah/menghapus
DROP POLICY IF EXISTS "retribution_types_update_admin" ON public.retribution_types;
DROP POLICY IF EXISTS "retribution_types_delete_admin" ON public.retribution_types;

CREATE POLICY "retribution_types_update_admin"
ON public.retribution_types FOR UPDATE TO authenticated
USING (public.is_current_user_admin_full())
WITH CHECK (public.is_current_user_admin_full());

CREATE POLICY "retribution_types_delete_admin"
ON public.retribution_types FOR DELETE TO authenticated
USING (public.is_current_user_admin_full());

COMMIT;
