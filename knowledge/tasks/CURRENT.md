# CURRENT — Task Aktif

**Sesi:** SESSION-2026-10-31-3 · **Update:** 2026-10-31T12:45:00+07:00 · **Branch:** `main` @ `9d066a4`

## Status

`WIP` — data operasional produksi kosong (pasar/lapak/tarif dihapus); menunggu seed data nyata oleh user.

## Task

| # | Task | Status | DoD |
|---|---|---|---|
| 1 | Inisialisasi knowledge root (`knowledge/`) | **SELESAI** | Artefak wajib §2.2 ada dengan isi nyata |
| 2 | Sprint 0 — amankan `api/users.ts` | **SELESAI** | Auth ADMIN + CORS; deploy `4a0e766`; produksi 401/403 terverifikasi |
| 3 | Sprint 0 — tinjau policy `user_roles` | **SELESAI** | Migration 007 applied; 4 policy; tanpa `USING (true)` |
| 4 | Sprint 0 — PIN lapak & Perumda secret | **SEBAGIAN** | PIN fail-closed selesai; fitur Perumda dihapus |
| 18 | ~~P0-04 — Perumda secret~~ | **DIHAPUS** | Fitur Perumda dihapus (admin = Perumda) |
| 19 | Full data wipe (DB + storage) | **SELESAI** | Data 0; tersisa 1 admin; master & roles dipertahankan |
| 20 | P1-05 — hijaukan typecheck/CI | **SELESAI** | `tsc --noEmit` 0 error; script `typecheck` ditambah |
| 21 | Hapus halaman juri (`/juri`, `/docs`) | **SELESAI** | Komponen + route dihapus; build/typecheck PASS |
| 22 | Hapus data retribusi & kategori lapak | **SELESAI** | types/rates/categories = 0 |
| 23 | Fase 1 token QR publik lapak | **SELESAI (kode+DB)** | Token + halaman publik + QR pemilik; PIN dihapus |
| 24 | Hapus fallback master retribusi hardcoded | **SELESAI** | `retributionMasterData.ts` dihapus; UI dari DB |
| 25 | Deploy produksi (16 commit) | **SELESAI** | `/api/lapak` 400, `/api/users` 401, `/api/perumda` 404 |
| 26 | P0 UI/UX batch (tema, placeholder, read-only, user delete) | **SELESAI (kode+DB)** | Migration 017; readOnly 9 halaman |
| 27 | P1 routing (deep-link admin, /login, 404) | **SELESAI** | `#superadmin/<tab>`; path-based ditunda |
| 28 | P2 polish (typo, QR, dialog, pagination) | **SELESAI** | Build/typecheck PASS |
| 29 | CI mobile — analyzer + widget test hijau | **SELESAI** | `flutter analyze` 0 issue; `flutter test` PASS; CI `.env` step |
| 30 | Sync knowledge sesi mobile CI | **SELESAI** | log, state, CURRENT, validation diperbarui |
| 31 | Import CSV legacy + UI admin | **SELESAI** | `csvImport`/`csvImportRunner`/`ImportDataPage`; tab `#superadmin/import`; 4 CSV nyata 0 error |
| 32 | Verifikasi import (typecheck/build/runner) | **SELESAI** | `tsc --noEmit` 0 error; `vite build` PASS; impor ulang idempoten (0 create/update) |
| 33 | Commit + push import CSV | **SELESAI** | Push `4b8b87b..20f4ba7`; CI `41148221841` success; bundle produksi memuat UI importer |
| 34 | Template CSV unduhan di dashboard | **SELESAI** | 2 template statis; terparse 0 error; tautan di halaman import; deploy `ba4880c` |
| 35 | Import CSV terpisah: pasar, lapak, tarif | **SELESAI** | `detectImportKind`; `runMarketImport`/`runStallImport`/`runRateImport`; UI per jenis; 3 template baru |
| 36 | Verifikasi split import | **SELESAI** | Simulasi pasar→lapak→tarif: 2 pasar, 5 lapak, 4 jenis, 8 tarif; impor ulang 0 create/update |
| 37 | Build + sinkron knowledge split import | **SELESAI** | `npm run typecheck` 0 error; `npm run build` PASS; `modules/import-csv.md` diperbarui |
| 38 | Deploy split import | **SELESAI** | Push `7fa05b0..19f8647`; CI `41150618429` success; 3 template produksi 200; bundle memuat UI impor baru |
| 39 | Kode lama lapak (migration 018 + UI/QR) | **SELESAI** | Kolom `legacy_code` di prod; kolom/field/QR label; deploy `d180591` |
| 40 | Impor 4 CSV legacy lalu rollback penuh | **SELESAI** | 4098 lapak / 7196 tarif / 3 pasar; typed "HAPUS DATA IMPOR" → semua dihapus satu transaksi |
| 41 | Hapus pasar NGD & pasar contoh MKS | **SELESAI** | Typed "HAPUS NGD" + "contoh pasar hapus juga"; markets=0, stalls=0; snapshot MKS tersimpan |
| 14 | P0-03 — env PIN lapak + deploy | **DIGANTI** | PIN dihapus; digantikan token QR per lapak (migration 016) |
| 15 | Role: MARKET_HEAD read-only + hapus impersonation | **SELESAI** | Migration 014; build PASS; deploy `86b62d6` |
| 16 | P0-12 — kredensial admin di halaman publik | **SELESAI (kode)** | Bundle bersih; rotasi password dipilih tidak dilakukan user |
| 17 | Role: hapus TREASURER (DB + auth + UI) | **SELESAI (DB+kode)** | 2 akun & role dihapus; admin ambil alih approval |
| 5 | Verifikasi build/typecheck web | **SELESAI** | `npm run typecheck` 0 error; `npm run build` PASS |
| 6 | Deploy + uji P0-01 di produksi | **SELESAI** | Tanpa token 401, origin asing 403; uji role belum |
| 7 | P0-06 — tutup RLS `retribution_rates` | **SELESAI** | Migration 008 applied; 4 policy terverifikasi |
| 8 | P0-05 — audit RLS produksi | **SELESAI** | 16 tabel / 46 policy; 6 temuan baru (S-11…S-16) |
| 9 | P0-07 — tutup RLS `users` | **SELESAI** | Migration 009 + trigger; uji eskalasi PASS |
| 10 | P0-08 — tutup RLS operasional | **SELESAI** | Migration 010; uji deny+allow PASS |
| 11 | P0-09 — aktifkan RLS `stall_categories` | **SELESAI** | Migration 011; anon ditolak, staf diizinkan |
| 12 | P0-10 — read scope + `setoran` | **SELESAI** | Migration 012; deny/allow PASS |
| 13 | P0-11 — PII `stall_owners` | **SELESAI** | Migration 013; anon hanya `id,name` |

## Scope sesi ini

- Impor CSV tiga jenis berkas: pasar (`contoh-pasar.csv`), lapak (`contoh-lapak.csv`),
  tarif (`contoh-tarif.csv`), dengan deteksi jenis otomatis; format gabungan legacy tetap didukung.
- Runner: `runMarketImport` (upsert pasar), `runStallImport` (pasar + sektor + pemilik + lapak),
  `runRateImport` (pasar/lapak harus ada, jenis dibuat otomatis, tarif di-upsert).
- `legacy_code`: migration 018, parser memilih kolom kode lama yang benar (bukan kolom kosong
  pengganti), kolom tabel + field form + label QR.
- Pembersihan produksi atas instruksi user: rollback seluruh data impor legacy, hapus NGD,
  hapus pasar contoh MKS.
- DDL/delete dijalankan lewat pooler IPv4 karena host DB langsung IPv6-only.

## Blocker

- Tidak ada blocker teknis aktif; typecheck/build/simulasi impor lokal hijau.
- Risiko diterima: password `admin@siaga.id` tidak dirotasi (keputusan user, S-18).
- Data operasional produksi kosong (0 pasar/lapak/tarif/transaksi) — diisi lewat Manajemen Pasar,
  tab Import Data (4 CSV gabungan di root repo, atau 3 CSV terpisah), atau pulihkan snapshot
  `knowledge/.qoder/index/snapshots/2026-10-31T12-30-00/`.

## Team Waves

Tidak ada gelombang paralel. `open_wave = null`.

## Next Session Handoff

1. Baca urutan resume: `state.json` → `index/index-state.json` → `context.md` → `memory.md` → `00_INDEX.md` → berkas ini.
2. **Seed data produksi** (DB kini kosong). Dua jalur:
   - Berkas terpisah: `contoh-pasar.csv` → `contoh-lapak.csv` → `contoh-tarif.csv`
     (atau ekspor sendiri dengan header sama); urutan wajib, "Import semua" mengurutkan otomatis.
   - Format gabungan: unggah 4 CSV root repo (`Sawah`, `Panakkukang`, `Terong`, `Niaga Daya`),
     target pasar terdeteksi otomatis (SWH/PNK/TRG; NGD kini harus dibuat ulang).
   Setelah itu uji `/@<slug>`, `/lapak/<token>`, dan alur petugas.
3. **Fase 2 mobile**: `scan_page.dart` membaca URL/token QR (satu QR untuk petugas & pemilik)
   + tombol notifikasi `wa.me`.
4. **Path-based URL** `/admin/*`, `/market/*` — ditunda; hash deep-link masih kanonik.
5. Opsional: toast menggantikan sebagian `alert`, focus-trap modal, pembersihan inline style.
