-- Script untuk insert user dari auth.users ke public.users
-- Jalankan di Supabase SQL Editor

INSERT INTO public.users (id, email, raw_user_meta_data, created_at)
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
