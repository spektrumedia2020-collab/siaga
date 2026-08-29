# Setup Panduan: Storage Bucket di Supabase

## Masalah
Form upload gambar tidak berfungsi karena:
1. Bucket Supabase belum dibuat atau nama tidak cocok
2. Environment variable `.env.local` belum dikonfigurasi dengan benar
3. Storage RLS policy belum di-apply

---

## Langkah 1: Cek Bucket yang Tersedia di Supabase

1. Masuk ke Supabase Dashboard
2. Pergi ke **Storage** menu sebelah kiri
3. Lihat daftar bucket yang sudah ada

**Pilihan A: Gunakan bucket yang sudah ada**
- Jika ada bucket bernama `data-siaga` atau `pasar-images` atau lainnya, catat nama exactnya

**Pilihan B: Buat bucket baru**
- Klik tombol **Create a new bucket**
- Nama bucket: `data-siaga` (tanpa spasi, lowercase)
- Buat checklist yang ada: **Public bucket** ✓
- Klik **Create**

---

## Langkah 2: Buat File `.env.local`

Di root folder project Siaga, buat file `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
VITE_SUPABASE_STORAGE_BUCKET=data-siaga
```

**Cara dapat `YOUR-PROJECT-ID` dan `YOUR-ANON-KEY`:**
1. Buka Supabase Dashboard
2. Klik **Settings** di bawah
3. Klik **API** di menu
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
5. Ubah bucket name sesuai step 1

---

## Langkah 3: Apply Storage RLS Policy

Di Supabase, buka **SQL Editor** dan jalankan:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-siaga', 'data-siaga', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "Allow public view" on storage.objects;
drop policy if exists "Allow authenticated update" on storage.objects;
drop policy if exists "Allow authenticated delete" on storage.objects;

create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'data-siaga'
);

create policy "Allow public view"
on storage.objects for select
to public
using (
  bucket_id = 'data-siaga'
);

create policy "Allow authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'data-siaga'
);

create policy "Allow authenticated delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'data-siaga'
);
```

**Jika menggunakan bucket lain** (bukan `data-siaga`):
- Ganti semua `'data-siaga'` dengan nama bucket Anda
- Ganti nilai `VITE_SUPABASE_STORAGE_BUCKET` di `.env.local`

---

## Langkah 4: Verifikasi

1. Save `.env.local`
2. Restart dev server: `npm run dev` (Ctrl+C lalu jalankan lagi)
3. Buka dashboard admin
4. Pergi ke **Konten Publik** tab
5. Upload gambar test untuk logo atau berita
6. Jika tidak ada error merah, upload berhasil ✓

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| "Bucket belum dibuat" | Pastikan bucket ada di Storage tab Supabase |
| "Kebijakan akses belum diizinkan" | Run SQL policy script di SQL Editor |
| "nama bucket salah" | Pastikan .env.local dan bucket name di Supabase sama |
| Upload berjalan tapi gambar jadi local blob | Supabase config OK, tapi fallback ke local (normal jika tidak ada bucket public) |

---

## Catatan Penting

- `.env.local` tidak boleh di-commit ke Git (sudah di .gitignore)
- Bucket name harus lowercase, tanpa spasi (app auto-normalize)
- Setiap project Supabase butuh bucket sendiri
- Untuk production, gunakan environment variable dari host (Vercel, Railway, dll)
