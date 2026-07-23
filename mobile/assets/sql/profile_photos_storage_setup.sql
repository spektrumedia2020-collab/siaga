-- Setup storage untuk foto profil
-- Buat bucket 'avatars' lewat Supabase Dashboard: Storage -> New bucket -> nama: avatars, public: true
-- Kemudian jalankan policy ini:

create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
);

create policy "Allow public view"
on storage.objects for select
to public
using (
  bucket_id = 'avatars'
);

create policy "Allow authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
);

create policy "Allow authenticated delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
);