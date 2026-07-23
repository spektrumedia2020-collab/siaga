-- Add officer_name column to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS officer_name TEXT;