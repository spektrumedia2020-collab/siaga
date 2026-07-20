-- Supabase Storage Policy for uploads
-- Jalankan di SQL Editor Supabase

-- 1. Buat bucket jika belum ada
-- Catatan: Bucket dibuat lewat dashboard Supabase Storage
-- Buat bucket dengan nama: data-siaga (tanpa spasi)

-- 2. Enable public access untuk bucket
-- Di dashboard: Storage → Settings → [x] Public bucket

-- 3. Storage Policies
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

-- 4. Alternatif: pakai bucket yang sudah ada (pasar images)
-- Jika bucket "pasar-images" sudah ada, pakai nama itu di kode