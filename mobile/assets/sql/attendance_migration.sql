-- Attendance table migration: add missing columns

-- Add columns if not exists
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS officer_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION;

-- Insert officer for mang.ugeng@gmail.com if not exists
INSERT INTO public.officers (user_id, market_id, name)
VALUES ('16257373-e0cb-456b-a403-984b00bec1aa', 1, 'mang.ugeng')
ON CONFLICT (user_id) DO NOTHING;