-- Officers seed data
-- Run this in Supabase SQL Editor after create_officers_table.sql

-- Contoh data officer, sesuaikan UUID dengan user login di Auth
INSERT INTO public.officers (user_id, market_id, name, code, phone)
VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Petugas A', 'OFF-001', '081234567801'),
  ('00000000-0000-0000-0000-000000000002', 1, 'Petugas B', 'OFF-002', '081234567802'),
  ('00000000-0000-0000-0000-000000000003', 2, 'Petugas C', 'OFF-003', '081234567803')
ON CONFLICT (user_id) DO NOTHING;