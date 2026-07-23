-- Add category_id to stalls if missing
ALTER TABLE public.stalls
  ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES stall_categories(id) ON DELETE SET NULL;