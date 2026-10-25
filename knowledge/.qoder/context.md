# Context Aktif (L0) — 2026-10-26

**Sesi:** SESSION-2026-10-25-1 · **Commit terakhir:** `d6e9f7a` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

**Batch UI/UX P0–P2 selesai di kode**: tema (migration 017), placeholder dihapus, read-only 9 halaman,
tab Superadmin deep-link, `/login` + 404, typo/QR/dialog/pagination. Typecheck 0, build PASS.
Menunggu deploy; path-based URL penuh dan Fase 2 mobile masih tertunda.

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
`src/pages/SuperAdminDashboardImproved.tsx` (tab Setoran), `migrations/007–015`.

## Next action (spesifik)

1. Buat pasar + lapak (DB kosong) agar `/lapak/<token>` bisa diuji.
2. Fase 2: mobile membaca QR URL/token; tombol WA `wa.me`.
3. Perbaiki mobile CI (`flutter analyze` gagal karena warning/info lama).
4. Opsional: test otomatis (P1-04).

## Catatan akses DB

Host direct `db.<ref>.supabase.co` hanya IPv6 dan tidak terjangkau dari mesin ini
(`getaddrinfo ENOTFOUND`). Eksekusi SQL lewat **Supabase SQL Editor** di browser (sesi login user),
atau butuh connection string **pooler IPv4**.
