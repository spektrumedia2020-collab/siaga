# Context Aktif (L0) — 2026-10-31

**Sesi:** SESSION-2026-10-31-2 · **Commit terakhir:** `e7fc25b` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

**Impor CSV legacy + UI admin selesai di kode** (`e7fc25b`): tab `#superadmin/import`
membaca 4 CSV root repo (Sawah, Panakkukang, Terong, Niaga Daya), pemetaan kolom otomatis,
impor idempoten. Typecheck/build PASS; menunggu push + seed produksi oleh user.
CI mobile sudah hijau (`8bf2dd0`). DB produksi masih kosong.

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

1. Push `e7fc25b`; verifikasi CI dan tab "📥 Import Data" di produksi.
2. Seed produksi: unggah 4 CSV root repo lewat `#superadmin/import`, lalu uji `/lapak/<token>`.
3. Fase 2: mobile membaca QR URL/token; tombol WA `wa.me`.
4. Opsional: test otomatis (P1-04).

## Catatan akses DB

Host direct `db.<ref>.supabase.co` hanya IPv6 dan tidak terjangkau dari mesin ini
(`getaddrinfo ENOTFOUND`). Eksekusi SQL lewat **Supabase SQL Editor** di browser (sesi login user),
atau butuh connection string **pooler IPv4**.
