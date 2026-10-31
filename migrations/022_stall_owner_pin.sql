-- ============================================================================
-- 022_stall_owner_pin.sql
--
-- Halaman publik lapak (/lapak/<token>) kini meminta PIN pemilik.
-- PIN default 7777, dapat diganti pemilik dari halaman publik dan direset
-- admin dari dashboard.
--
-- Hash disimpan di tabel terpisah `stall_access_pins` yang RLS-nya aktif
-- tanpa policy, sehingga anon/authenticated tidak bisa membaca hash lewat
-- PostgREST. Default 7777 tidak disimpan sebagai baris; fungsi memperlakukan
-- "belum ada baris" sebagai PIN 7777. Baris baru dibuat saat PIN diganti.
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.stall_access_pins (
  stall_id bigint PRIMARY KEY REFERENCES public.stalls(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stall_access_pins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stall_access_pins FROM PUBLIC;
REVOKE ALL ON TABLE public.stall_access_pins FROM anon;
REVOKE ALL ON TABLE public.stall_access_pins FROM authenticated;

-- Dipakai server (service role) untuk memverifikasi PIN sebelum data lapak
-- dikirim oleh /api/lapak. Tidak dapat dipanggil anon.
CREATE OR REPLACE FUNCTION public.verify_stall_pin(p_stall_id bigint, p_pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (SELECT 1 FROM public.stalls WHERE id = p_stall_id)
     AND coalesce(
       (
         SELECT pin_hash = extensions.crypt(coalesce(p_pin, ''), pin_hash)
         FROM public.stall_access_pins
         WHERE stall_id = p_stall_id
       ),
       coalesce(p_pin, '') = '7777'
     )
$$;

REVOKE ALL ON FUNCTION public.verify_stall_pin(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_stall_pin(bigint, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_stall_pin(bigint, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_stall_pin(bigint, text) TO service_role;

-- Dipanggil halaman publik: pemilik mengganti PIN dengan PIN lama sebagai bukti.
CREATE OR REPLACE FUNCTION public.set_stall_pin(p_token text, p_old_pin text, p_new_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target public.stalls%ROWTYPE;
  current_hash text;
BEGIN
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN baru harus 4 angka';
  END IF;

  SELECT * INTO target FROM public.stalls WHERE public_token = btrim(p_token);
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Lapak tidak ditemukan';
  END IF;

  SELECT pin_hash INTO current_hash
  FROM public.stall_access_pins
  WHERE stall_id = target.id;

  IF current_hash IS NOT NULL THEN
    IF current_hash <> extensions.crypt(coalesce(p_old_pin, ''), current_hash) THEN
      PERFORM pg_sleep(0.3);
      RAISE EXCEPTION 'PIN lama salah';
    END IF;
  ELSIF coalesce(p_old_pin, '') <> '7777' THEN
    PERFORM pg_sleep(0.3);
    RAISE EXCEPTION 'PIN lama salah';
  END IF;

  INSERT INTO public.stall_access_pins (stall_id, pin_hash, updated_at)
  VALUES (target.id, extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8)), now())
  ON CONFLICT (stall_id)
  DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_stall_pin(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stall_pin(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.set_stall_pin(text, text, text) TO authenticated;

-- Dipanggil dashboard: admin / pengelola pasar mereset PIN lapak.
CREATE OR REPLACE FUNCTION public.admin_set_stall_pin(p_stall_id bigint, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_market bigint;
BEGIN
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN harus 4 angka';
  END IF;

  SELECT market_id INTO target_market FROM public.stalls WHERE id = p_stall_id;
  IF target_market IS NULL THEN
    RAISE EXCEPTION 'Lapak tidak ditemukan';
  END IF;

  IF NOT (public.is_current_user_admin_full() OR public.is_current_user_market_member(target_market)) THEN
    RAISE EXCEPTION 'Tidak berwenang mengganti PIN lapak ini';
  END IF;

  INSERT INTO public.stall_access_pins (stall_id, pin_hash, updated_at)
  VALUES (p_stall_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), now())
  ON CONFLICT (stall_id)
  DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_stall_pin(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_stall_pin(bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_stall_pin(bigint, text) TO authenticated;

COMMIT;

-- Verifikasi:
-- SELECT verify_stall_pin((SELECT id FROM public.stalls LIMIT 1), '7777');  -- true
-- SELECT verify_stall_pin((SELECT id FROM public.stalls LIMIT 1), '0000');  -- false
-- SELECT count(*) FROM public.stall_access_pins;                             -- 0 (default belum disimpan)
