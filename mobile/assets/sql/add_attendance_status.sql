-- Add status column to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS status TEXT;