# Context Aktif (L0) — 2026-10-26

**Sesi:** SESSION-2026-10-25-1 · **Commit terakhir:** `6177e11` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

Semua perbaikan kode selesai: typecheck 0 error, build PASS, RLS 007–015 live, fitur Perumda dihapus.
**Satu-satunya blocker deploy:** `PUBLIC_STALL_PIN_HASH` belum diset di Vercel (push 10 commit ditunda).

## Status keamanan ringkas

- S-01…S-17: **fixed/verified** (detail di [SECURITY.md](../security/SECURITY.md)).
- S-18: kode bersih (tanpa kredensial di bundle); rotasi password **dipilih tidak dilakukan** user.
- S-04: **removed** — fitur Perumda dihapus (admin = Perumda).
- S-03: kode fail-closed; menunggu env + deploy.

## Data produksi

Wiped 2026-10-26: semua tabel operasional 0; tersisa 1 admin, 4 roles, 7 retribution_types,
5 stall_categories; storage 0 objek.

## Berkas kunci

`api/users.ts`, `api/lapak.ts`, `src/App.tsx`, `src/lib/roleUtils.ts`,
`src/pages/SuperAdminDashboardImproved.tsx` (tab Setoran), `migrations/007–015`.

## Next action (spesifik)

1. Set `PUBLIC_STALL_PIN_HASH` di Vercel (Production).
2. Push 10 commit → Vercel rebuild → verifikasi: `pin=1234` 401, login admin, halaman lapak normal,
   `/juri` & `/api/perumda` → 404/login (fitur dihapus).
3. Cek CI web (`gh run list`) — seharusnya hijau.
4. Opsional: siapkan data awal; P1-04 test otomatis.

## Catatan akses DB

Host direct `db.<ref>.supabase.co` hanya IPv6 dan tidak terjangkau dari mesin ini
(`getaddrinfo ENOTFOUND`). Eksekusi SQL lewat **Supabase SQL Editor** di browser (sesi login user),
atau butuh connection string **pooler IPv4**.
