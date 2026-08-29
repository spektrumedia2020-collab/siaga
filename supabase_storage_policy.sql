-- Supabase Storage Policy for uploads
-- Jalankan di SQL Editor Supabase

-- 1. Pastikan bucket yang dipakai ada dan public
-- Default yang dipakai aplikasi adalah: data-siaga
-- Jika Anda ingin memakai bucket lain, sesuaikan nama di VITE_SUPABASE_STORAGE_BUCKET

INSERT INTO storage.buckets (id, name, public)
VALUES ('data-siaga', 'data-siaga', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Storage Policies
-- Drop existing policies jika ada
drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "Allow public view" on storage.objects;
drop policy if exists "Allow authenticated update" on storage.objects;
drop policy if exists "Allow authenticated delete" on storage.objects;

-- Policy untuk insert (upload)
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'data-siaga'
);

-- Policy untuk select (view)
create policy "Allow public view"
on storage.objects for select
to public
using (
  bucket_id = 'data-siaga'
);

-- Policy untuk update
create policy "Allow authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'data-siaga'
);

-- Policy untuk delete
create policy "Allow authenticated delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'data-siaga'
);

-- 3. Jika Anda ingin memakai bucket lain, ganti semua 'data-siaga' di bawah dengan nama bucket Anda.
-- Contoh: 'pasar-images'