-- ============================================================================
-- 024_market_contact_phone.sql
--
-- Nomor kontak pengelola pasar untuk bantuan pemilik (mis. saat nomor HP
-- pemilik belum terdaftar). Ditampilkan sebagai tombol WhatsApp/Telepon di
-- halaman publik lapak dan dapat diubah admin di Edit Pasar.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS contact_phone text;

COMMENT ON COLUMN public.markets.contact_phone IS
  'Nomor WhatsApp/telepon pengelola pasar untuk bantuan pemilik lapak';

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_admin_select ON public.app_settings;
CREATE POLICY app_settings_admin_select ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin_full());

DROP POLICY IF EXISTS app_settings_admin_insert ON public.app_settings;
CREATE POLICY app_settings_admin_insert ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin_full());

DROP POLICY IF EXISTS app_settings_admin_update ON public.app_settings;
CREATE POLICY app_settings_admin_update ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin_full())
  WITH CHECK (public.is_current_user_admin_full());

DROP POLICY IF EXISTS app_settings_admin_delete ON public.app_settings;
CREATE POLICY app_settings_admin_delete ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.is_current_user_admin_full());

REVOKE ALL ON TABLE public.app_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_settings TO authenticated;

COMMIT;

-- Verifikasi:
-- SELECT id, name, contact_phone FROM public.markets WHERE id = 39;
-- SELECT key, value FROM public.app_settings;
