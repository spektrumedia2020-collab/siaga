-- Officers seed data
-- Run this in Supabase SQL Editor after create_officers_table.sql
-- FIX 23 Agu 2026: hapus kolom `code` & `phone` (tidak ada di skema officers).
-- Skema officers: id, user_id, market_id, name, created_at, updated_at

-- Contoh data officer, sesuaikan UUID dengan user login di Auth
INSERT INTO public.officers (user_id, market_id, name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Petugas A'),
  ('00000000-0000-0000-0000-000000000002', 1, 'Petugas B'),
  ('00000000-0000-0000-0000-000000000003', 2, 'Petugas C')
ON CONFLICT (user_id) DO NOTHING;