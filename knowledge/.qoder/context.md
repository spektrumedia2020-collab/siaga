# Context Aktif (L0) — 2026-10-31

**Sesi:** SESSION-2026-10-31-3 · **Commit terakhir:** `ba4880c` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

**Impor CSV tiga jenis berkas selesai di kode:** pasar / lapak / tarif terpisah, terdeteksi otomatis
(`detectImportKind`), dengan runner `runMarketImport`, `runStallImport`, `runRateImport`. Format gabungan
legacy (Sawah, Panakkukang, Terong, Niaga Daya) tetap didukung. Template baru:
`/templates/contoh-pasar.csv`, `contoh-lapak.csv`, `contoh-tarif.csv`.
Typecheck/build PASS; simulasi pasar→lapak→tarif idempoten. DB produksi masih kosong.

## Status keamanan ringkas

- S-01…S-17: **fixed/verified** (detail di [SECURITY.md](../security/SECURITY.md)).
- S-18: kode bersih (tanpa kredensial di bundle); rotasi password **dipilih tidak dilakukan** user.
- S-04: **removed** — fitur Perumda dihapus (admin = Perumda).
- S-03: kode fail-closed; menunggu env + deploy.

## Data produksi

Wiped 2026-10-26: semua tabel operasional 0; master retribusi (`retribution_types`, `retribution_rates`)
dan `stall_categories` juga 0. Tersisa 1 admin + 4 `roles`; storage 0 objek.

## Berkas kunci

`api/users.ts`, `api/lapak.ts`, `src/App.tsx`, `src/lib/roleUtils.ts`,
`src/lib/csvImport.ts`, `src/lib/csvImportRunner.ts`, `src/pages/ImportDataPage.tsx`,
`src/pages/SuperAdminDashboardImproved.tsx`, `migrations/007–017`.

## Next action (spesifik)

1. Verifikasi CI + `/templates/contoh-pasar.csv` di produksi setelah push.
2. Seed produksi lewat `#superadmin/import`: jalur terpisah pasar → lapak → tarif, atau 4 CSV gabungan
   root repo; lalu uji `/lapak/<token>`.
3. Fase 2: mobile membaca QR URL/token; tombol WA `wa.me`.
4. Opsional: test otomatis (P1-04).

## Catatan akses DB

Host direct `db.<ref>.supabase.co` hanya IPv6 dan tidak terjangkau dari mesin ini
(`getaddrinfo ENOTFOUND`). Eksekusi SQL lewat **Supabase SQL Editor** di browser (sesi login user),
atau butuh connection string **pooler IPv4**.
