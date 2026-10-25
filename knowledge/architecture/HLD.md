# HLD — High Level Design

Status: **VERIFIED** (kode + konfigurasi deploy) · 2026-10-25

## Diagram komponen

```
                    ┌──────────────────────────────┐
   Admin/Petugas ──▶│  WEB SPA (React 19 + Vite)   │
                    │  src/  · hash router          │
                    └───────┬──────────────┬───────┘
                            │ anon key     │ fetch /api/*
                            ▼              ▼
   ┌────────────────────────────┐   ┌────────────────────────────────┐
   │  SUPABASE                  │   │  VERCEL FUNCTIONS (api/)       │
   │  · Auth (JWT)              │◀──│  · users.ts   (service role)   │
   │  · Postgres + RLS          │   │  · lapak.ts   (service role)   │
   │  · Storage                 │   │                                │
   └───────────▲────────────────┘   └────────────────────────────────┘
               │ anon key + JWT
               │
   ┌───────────┴────────────────┐        ┌──────────────────────────┐
   │ MOBILE (Flutter)           │        │ EXPRESS (src/server.ts)  │
   │ siaga_officer              │        │ 5 router · port 3001     │
   │ sqflite offline + sync     │        │ TIDAK dibangun Vercel    │
   └────────────────────────────┘        └──────────────────────────┘
```

## Komponen & tanggung jawab

| Komponen | Tanggung jawab | Batas |
|---|---|---|
| Web SPA | UI admin/petugas, halaman publik, export | Akses data lewat Supabase langsung + 3 endpoint |
| Supabase | Source of truth data, auth, storage, RLS | Skema dikelola via SQL manual |
| Vercel functions | Operasi privileged (user admin, lapak publik) | Service role, wajib otorisasi sendiri |
| Express | Alternatif backend CRUD lengkap (markets/officers/stalls/transactions/users) | Hanya untuk `npm run server`; tidak deploy |
| Mobile | Transaksi lapangan, absensi, setoran, struk, offline | Supabase langsung + sqflite |

## Keputusan arsitektur yang berlaku

1. **Supabase-first** untuk data operasional (lihat [ADR-001](../decisions/ADR-001-supabase-first.md)).
2. Serverless function dipakai hanya saat butuh service role yang tidak boleh ada di klien.
3. Mobile mengutamakan kerja offline (sqflite) lalu sinkronisasi.

## Risiko struktural (aktif)

| ID | Risiko | Bukti |
|---|---|---|
| A-01 | Dua backend paralel (Express vs Vercel) dengan logika user duplikat | `src/routes/users.ts` vs `api/users.ts` |
| A-02 | Otorisasi hanya di Express; `api/users.ts` tanpa auth | `src/server.ts:86`, `api/users.ts` |
| A-03 | Skema ganda: `stalls/stall_owners` (baru) vs `lapak/pemilik_lapak` (legacy) | `mobile/lib/services/stall_repository.dart:41,84` |
| A-04 | Migrasi SQL tersebar 4 lokasi | lihat `database/SCHEMA.md` |
