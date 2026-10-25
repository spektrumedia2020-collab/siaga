# SYSTEM_CONTEXT — SIAGA

Status: **VERIFIED** (kode) · 2026-10-25

## Aktor

| Aktor | Kanal | Kebutuhan utama |
|---|---|---|
| Superadmin (`ADMIN`) | Web | Kelola semua pasar, user, role, tema, impersonate |
| Admin Pasar (`MARKET_HEAD` dkk.) | Web | Kelola pasar sendiri: lapak, pedagang, petugas, tarif, laporan |
| Bendahara (`TREASURER`) | Web | Approval setoran tahap 1, rekonsiliasi |
| Petugas (`OFFICER`) | Mobile (utama), Web | Catat transaksi retribusi, absensi, setoran |
| Pedagang / publik | Web publik | Lihat info lapak via `/lapak/:marketId/:kode` (PIN) dan landing pasar `/@slug` |

## Sistem eksternal

| Sistem | Fungsi | Bukti |
|---|---|---|
| Supabase Auth | Login email/password, JWT | `src/components/Auth.tsx`, `src/middleware/auth.ts` |
| Supabase Postgres | Seluruh data operasional + RLS | `src/lib/api.ts`, `api/*.ts` |
| Supabase Storage | Foto pasar/lapak/struk (bucket `data-siaga`, `avatars`) | `src/lib/supabase.ts:31`, `mobile/lib/features/dashboard/dashboard_page.dart:892` |
| Vercel | Hosting SPA + 3 serverless function | `vercel.json` |
| Google Sheets API | Export laporan (OAuth) | `src/lib/googleSheetsAuth.ts`, `src/lib/exportUtils.ts` |
| Kamera & GPS perangkat | Scan QR, absensi ber-lokasi | `mobile/pubspec.yaml` (mobile_scanner, geolocator) |

## Batas kepercayaan

```
[Browser/Mobile]  --anon key + JWT user-->  [Supabase: RLS = kontrol utama]
[Browser/Mobile]  --HTTPS-->                [Vercel functions: service role = trusted]
[Express server]  --service role-->         [Supabase: bypass RLS]
```

- Kunci `VITE_*` bersifat publik; tidak boleh ada service key di sana (terverifikasi: tidak ada).
- `api/*.ts` berjalan dengan **service role** → setiap fungsi wajib melakukan otorisasinya sendiri.
  Saat ini: `users` (JWT + peran ADMIN) dan `lapak` (PIN).

## Asumsi yang belum diverifikasi

- Konfigurasi Supabase produksi (sign-up on/off, daftar policy aktual, bucket publik/privat) — `UNKNOWN`.
- Apakah `api/users.ts` memang ter-deploy di produksi — `INFERRED` dari `vercel.json` routes.
