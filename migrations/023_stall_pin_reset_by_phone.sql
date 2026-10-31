-- ============================================================================
-- 023_stall_pin_reset_by_phone.sql
--
-- Pemilik yang lupa PIN dapat mengatur PIN baru dengan memverifikasi nomor HP
-- yang terdaftar di data pemilik lapak. Tidak ada SMS/OTP berbayar.
--
-- Fungsi hanya dapat dipanggil server (/api/lapak) dengan service role:
-- nomor HP tidak pernah dikirim ke browser dan hash PIN tetap di tabel
-- stall_access_pins yang RLS-nya tanpa policy.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.reset_stall_pin_with_phone(
  p_token text,
  p_phone text,
  p_new_pin text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target public.stalls%ROWTYPE;
  owner_phone text;
  normalized_input text;
  normalized_owner text;
BEGIN
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN baru harus 4 angka';
  END IF;

  SELECT * INTO target FROM public.stalls WHERE public_token = btrim(p_token);
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Lapak tidak ditemukan';
  END IF;

  IF target.owner_id IS NULL THEN
    RAISE EXCEPTION 'Pemilik lapak belum terdaftar; hubungi pengelola pasar';
  END IF;

  SELECT phone INTO owner_phone FROM public.stall_owners WHERE id = target.owner_id;

  normalized_owner := regexp_replace(coalesce(owner_phone, ''), '[^0-9]', '', 'g');
  IF left(normalized_owner, 2) = '62' THEN
    normalized_owner := '0' || substr(normalized_owner, 3);
  END IF;

  IF normalized_owner = '' THEN
    RAISE EXCEPTION 'Nomor HP pemilik belum terdaftar; hubungi pengelola pasar';
  END IF;

  normalized_input := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF left(normalized_input, 2) = '62' THEN
    normalized_input := '0' || substr(normalized_input, 3);
  END IF;

  IF normalized_input = '' OR normalized_input <> normalized_owner THEN
    PERFORM pg_sleep(0.5);
    RAISE EXCEPTION 'Nomor HP tidak cocok';
  END IF;

  INSERT INTO public.stall_access_pins (stall_id, pin_hash, updated_at)
  VALUES (target.id, extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8)), now())
  ON CONFLICT (stall_id)
  DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_stall_pin_with_phone(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_stall_pin_with_phone(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.reset_stall_pin_with_phone(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_stall_pin_with_phone(text, text, text) TO service_role;

COMMIT;

-- Verifikasi (ganti <token>):
-- SELECT reset_stall_pin_with_phone('<token>', '<nomor-hp-pemilik>', '1234');
-- SELECT verify_stall_pin((SELECT id FROM public.stalls WHERE public_token = '<token>'), '1234');
