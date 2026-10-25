# 00_INDEX — SIAGA Knowledge Root

> Satu root canonical: `knowledge/` (AGY-QODER OS §2.1). `AGENTS.md` dan dokumen di root repo
> berstatus **SUMBER LAMA / RUJUKAN**, bukan knowledge aktif kedua.
> Terakhir diperbarui: 2026-10-25 (SESSION-2026-10-25-1)

## Mulai dari sini (urutan boot §11.14)

| # | Berkas | Isi |
|---|---|---|
| 1 | [.qoder/state.json](./.qoder/state.json) | Status mesin (commit, task, dirty, next_step) |
| 2 | [.qoder/index/index-state.json](./.qoder/index/index-state.json) | Status code index (kini `UNAVAILABLE`) |
| 3 | [.qoder/context.md](./.qoder/context.md) | Konteks aktif L0 |
| 4 | [.qoder/memory.md](./.qoder/memory.md) | Memori permanen L1 (terverifikasi) |
| 5 | [tasks/CURRENT.md](./tasks/CURRENT.md) | Task aktif + handoff |
| 6 | [tasks/BACKLOG.md](./tasks/BACKLOG.md) | Antrean kerja berprioritas |
| 7 | [tasks/DONE.md](./tasks/DONE.md) | Arsip selesai |

## Project

- [01_PROJECT.md](./01_PROJECT.md) — identitas, domain bisnis, stack, perintah, env, konvensi

## Arsitektur

- [architecture/SYSTEM_CONTEXT.md](./architecture/SYSTEM_CONTEXT.md) — aktor & sistem eksternal
- [architecture/HLD.md](./architecture/HLD.md) — komponen & batas (termasuk duplikasi backend)
- [architecture/LLD.md](./architecture/LLD.md) — modul kode, auth flow, role resolution, offline sync
- [architecture/DATA_FLOW.md](./architecture/DATA_FLOW.md) — alur data per use case

## Database & API

- [database/SCHEMA.md](./database/SCHEMA.md) — tabel, kolom kunci, RLS, sumber SQL
- [database/RELATIONSHIPS.md](./database/RELATIONSHIPS.md) — relasi & kardinalitas
- [api/API.md](./api/API.md) — endpoint Express + Vercel + route publik web

## Keamanan

- [security/SECURITY.md](./security/SECURITY.md) — temuan aktif (S-01…S-09) + evidence

## Modul

- [modules/web-frontend.md](./modules/web-frontend.md) — React admin/petugas + halaman publik
- [modules/mobile-officer.md](./modules/mobile-officer.md) — Flutter petugas lapangan (offline-first)
- [modules/backend-api.md](./modules/backend-api.md) — Express `src/server.ts` + Vercel `api/*.ts`

## Keputusan & Log

- [decisions/ADR-001-supabase-first.md](./decisions/ADR-001-supabase-first.md)
- [logs/2026-10-25.md](./logs/2026-10-25.md)

## Rujukan root repo (bukan canonical)

- `AUDIT_REPORT.md`, `TODO_FIXES.md` (audit 23 Agu 2026) — **sebagian STALE**:
  klaim "semua route diamankan" tidak berlaku untuk `api/users.ts` (lihat SECURITY S-01).
- `ARCHITECTURE_IMPROVEMENT_PLAN.md`, `ARCHITECTURE_REVIEW_COMPLETE.md`
- `EXPORT_FEATURE.md`, `GOOGLE_SHEETS_SETUP.md`, `SETUP_STORAGE_BUCKET.md`, `URL_ROUTING.md`
- `DEPLOYMENT_GUIDE.md`, `DEVELOPMENT.md`

## Legenda status bukti

`VERIFIED` (E1 source aktual) · `INFERRED` (turunan, belum diuji) · `UNKNOWN` (belum diperiksa) ·
`CONFLICT` (sumber bertentangan) · `STALE` (dulu benar, kini tidak).
