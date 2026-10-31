# 01_PROJECT — SIAGA

Status dokumen: **VERIFIED** (dari `package.json`, `mobile/pubspec.yaml`, tree source, `vercel.json`).
Tanggal: 2026-10-25 · Commit: `73c7267e837735ef082dc50ce653bcb51833f6f0`

## Identitas

| Field | Nilai |
|---|---|
| Nama | SIAGA — Sistem Informasi Manajemen Pasar |
| Domain | Retribusi & operasional pasar daerah (Perumda / pengelola pasar) |
| Bahasa UI | Indonesia |
| Repo | monorepo: web + serverless + Flutter |
| Deploy web | Vercel (`vercel.json`: static build `dist` + 3 serverless function) |
| URL produksi | `https://siaga.app` (308 → `https://www.siaga.app`; `siaga-pi.vercel.app` tetap deployment Vercel) |
| Backend data | Supabase (Postgres + Auth + Storage) |
| Branch aktif | `main` |

## Pengguna & peran

| Peran | Kewenangan (dari kode) |
|---|---|
| `ADMIN` | Superadmin: semua pasar, manajemen user, impersonate |
| `MARKET_HEAD` (+ alias `MARKET_ADMIN`, `ADMIN_PASAR`, `PASAR_ADMIN`) | Admin satu pasar |
| `TREASURER` | Bendahara: approval setoran tahap 1 |
| `OFFICER` | Petugas lapangan: transaksi, absensi, setoran |
| `MERCHANT` | Pedagang (label saja; belum ada UI khusus di web) |

Role disimpan ganda: tabel `user_roles` (utama) dan `users.id_role` (fallback) —
lihat [architecture/LLD.md](./architecture/LLD.md#role-resolution).

## Stack

### Web (`src/`)
- React 19, TypeScript 5.6, Vite 8, zustand, recharts, react-qr-code, xlsx, papaparse
- Routing: hash-based manual di `src/App.tsx` + path publik (`/@slug`, `/lapak/<token>`; legacy `/lapak/:marketId/:kode`)
- Data akses: `@supabase/supabase-js` dengan anon key + RLS (`src/lib/supabase.ts`, `src/lib/api.ts`)

### Backend Express (`src/server.ts`, `src/routes/*`)
- Express 4, helmet, cors, express-rate-limit, jsonwebtoken, pg, bcryptjs, tsx
- Auth: verifikasi Supabase JWT via `supabaseAdmin.auth.getUser()` (`src/middleware/auth.ts`)
- Dipakai saat menjalankan `npm run server` (port 3001); **tidak** dibangun oleh `vercel.json`

### Vercel Functions (`api/`)
- `api/users.ts`, `api/lapak.ts` — memakai service-role key
- Status: **duplikasi lapisan backend** (konflik dengan rencana "hapus api/" di AUDIT_REPORT)

### Mobile (`mobile/`)
- Flutter SDK ^3.12, supabase_flutter, flutter_riverpod, go_router, dio, sqflite (offline lokal),
  geolocator (absensi), mobile_scanner (QR), pdf + printing (struk), flutter_dotenv
- App: `siaga_officer` — untuk petugas lapangan

## Perintah

```bash
npm run dev       # Vite dev server (web)
npm run build     # vite build -> dist/
npm run preview   # preview build
npm run server    # Express (tsx watch) port 3001
npm run migrate   # tsx src/migrate.ts
npm run test      # node --test (belum ada test file terverifikasi)
```

Mobile (dari `mobile/`): `flutter pub get` · `flutter run` · `flutter analyze` · `flutter build apk`.

## Environment

Template: `.env.template` (web) dan `mobile/.env.example`.
Tidak ada berkas env yang ter-track git (VERIFIED: `git ls-files` hanya `.env.template`, `mobile/.env.example`).

| Variabel | Sisi | Wajib |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | web (publik) | ya |
| `VITE_SUPABASE_STORAGE_BUCKET` | web | tidak (default `data-siaga`) |
| `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` | web | untuk export Google Sheets |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | server/function | ya (rahasia) |
| `FRONTEND_URL` | Express CORS | produksi |

## Konvensi

- Bahasa komentar/komunikasi: Indonesia; identifier kode: Inggris/campuran.
- UI: CSS file per komponen/page; sebagian masih inline style.
- Tidak ada linter/formatter terpasang (no eslint/prettier config di `package.json`).
- SQL migrasi tersebar di 4 lokasi (lihat [database/SCHEMA.md](./database/SCHEMA.md#sumber-sql)) —
  **risiko drift, belum ada satu sumber migrasi**.

## Peta direktori

```
src/            web React (components, pages, routes, lib, middleware)
api/            Vercel serverless functions (users, lapak)
mobile/         Flutter app petugas + SQL assets + migrations
migrations/     3 migrasi SQL terbaru (004–006)
public/         aset statis web
*.sql (root)    SQL ad-hoc (seed, fix FK, policy, import data CSV)
*.csv           data pasar (sumber import)
```
