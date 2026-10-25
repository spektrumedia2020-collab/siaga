# Memory Permanen (L1) — SIAGA

> Hanya pengetahuan **terverifikasi** dari source aktual per 2026-10-25 (commit `73c7267`).
> Detail panjang ada di dokumen arsitektur; berkas ini ringkas dan stabil.

## Arsitektur

- **Supabase-first**: web & mobile mengakses Supabase langsung dengan anon key + RLS.
  Express/Vercel hanya untuk operasi yang butuh service role (manajemen user, dashboard Perumda, halaman lapak publik).
- Dua lapisan backend hidup bersamaan: Express (`src/server.ts`, 5 router) dan Vercel functions (`api/*.ts`).
  `vercel.json` **hanya** membangun `api/*`; Express tidak ikut deploy Vercel. *(VERIFIED)*
- Web memakai hash router manual di `src/App.tsx`; route publik berbasis pathname:
  `/@slug`, `/lapak/:marketId/:kode`, `/juri`, `/docs`, `/perumda`. *(VERIFIED)*

## Auth & peran

- Login web: Supabase `signInWithPassword`; **sign-up juga aktif di UI** (`Auth.tsx`). *(VERIFIED)*
- Otorisasi web berbasis peran diambil dari DB (`roleUtils.getUserRole`) → halaman dirender per role. *(VERIFIED)*
- Sumber peran ganda: `user_roles` (utama) → fallback `users.id_role`. Perubahan harus menjaga keduanya konsisten. *(VERIFIED)*
- Express: `authenticateToken` (verifikasi Supabase JWT) + `requireAdmin` untuk `/api/users`. *(VERIFIED)*
- Vercel `api/users.ts`: **tidak ada** pemeriksaan auth sama sekali. *(VERIFIED — CRITICAL)*

## Business rules (dari struktur DB & UI)

- Retribusi: tarif per pasar/kategori di `retribution_rates`, jenis di `retribution_types`. *(INFERRED dari pemakaian kode)*
- Transaksi retribusi mencatat `market_id`, `stall_id`, `amount`, `status` (`paid` dianggap lunas). *(VERIFIED dari `api/perumda.ts`)*
- Setoran petugas punya alur approval: `pending_treasurer` → `pending_head` → `approved`/`rejected`. *(VERIFIED dari `mobile/migrations/001_init.sql`)*
- Absensi petugas menyimpan check-in/out + data lokasi (geolocator). *(VERIFIED dari pubspec + tabel attendance)*
- Halaman lapak publik diakses dengan PIN 4 digit (env `PUBLIC_STALL_PIN`/`_HASH`). *(VERIFIED)*

## Aturan keamanan yang mengikat

- Service-role key **hanya** boleh di server/function, tidak pernah `VITE_*`. *(VERIFIED: hanya ada di `src/`, `api/`)*
- Jangan andalkan `ProtectedRoute` (client-side) sebagai kontrol akses tunggal — kontrol sebenarnya adalah RLS. *(VERIFIED)*
- RLS sudah diperketat (2026-10-25): `user_roles` (007) read sendiri/admin, tulis admin;
  `retribution_rates` (008) tulis admin atau staf pasar terkait; SELECT tarif tetap terbuka.
  **Namun `users` masih terbuka** (SELECT/INSERT/UPDATE `true`) → eskalasi ADMIN lewat `users.id_role`;
  `transactions`, `stalls`, `stall_owners` juga `true`; `stall_categories` RLS nonaktif.
  *(VERIFIED di SQL + pg_policies)*

## Konstrain

- Tidak ada test otomatis di `src/` dan `api/`; `npm test` = `node --test` tanpa file test terverifikasi. *(VERIFIED untuk src/api; mobile = UNKNOWN)*
- Tidak ada ESLint/Prettier. Build/typecheck belum diverifikasi pada sesi ini.
- SQL migrasi tersebar di 4 lokasi (root, `migrations/`, `mobile/migrations/`, `mobile/assets/sql/`) → drift risk.

## Integrasi eksternal

- Google Sheets export (OAuth) via `src/lib/googleSheetsAuth.ts` + `exportUtils.ts`. *(VERIFIED)*
- Supabase Storage bucket default `data-siaga` untuk foto pasar/lapak/struk. *(VERIFIED)*
