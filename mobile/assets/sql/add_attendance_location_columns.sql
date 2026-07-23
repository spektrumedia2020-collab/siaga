-- Add location columns to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION;