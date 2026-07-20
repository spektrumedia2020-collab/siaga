-- Tambah kolom foto pasar jika belum ada
ALTER TABLE public.markets
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS head_photo_url TEXT;

-- Optional: set default null jika diperlukan
ALTER TABLE public.markets
ALTER COLUMN photo_url DROP NOT NULL,
ALTER COLUMN head_photo_url DROP NOT NULL;
