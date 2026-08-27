-- ============================================
-- Fix: tabel user_roles hilang (404 di web app)
-- Jalankan di Supabase SQL Editor
-- Idempotent: aman dijalankan berulang kali
-- ============================================

-- 1. Tabel roles kemungkinan sudah ada - hanya buat jika belum ada
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Hanya isi role standar jika tabel masih kosong
INSERT INTO public.roles (name)
SELECT 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM public.roles);

-- 2. Buat ulang tabel user_roles sesuai skema yang dipakai aplikasi:
--    id, user_id, role_id, market_id + relasi roles(name), markets(name)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  market_id INTEGER REFERENCES public.markets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_market_id ON public.user_roles(market_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role_market
  ON public.user_roles(user_id, role_id, COALESCE(market_id, -1));

-- 3. Enable RLS + policies agar client anon/authenticated bisa select/insert/update miliknya
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated USING (true);

-- 4. Sinkronkan data existing dari users.id_role ke user_roles (jika ada)
INSERT INTO public.user_roles (user_id, role_id, market_id)
SELECT u.auth_uid, u.id_role, u.market_id
FROM public.users u
WHERE u.auth_uid IS NOT NULL AND u.id_role IS NOT NULL
ON CONFLICT DO NOTHING;
