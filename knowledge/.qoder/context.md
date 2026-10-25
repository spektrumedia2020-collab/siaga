# Context Aktif (L0) — 2026-10-26

**Sesi:** SESSION-2026-10-25-1 · **Commit terakhir:** `6177e11` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

Semua perbaikan kode selesai: typecheck 0 error, build PASS, RLS 007–015 live, fitur Perumda dihapus,
akses lapak publik kini berbasis **token QR** (PIN dihapus). **Deploy siap** — tidak ada env blocker.

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

1. Push 13 commit → Vercel rebuild.
2. Verifikasi: `/lapak/<token>` menampilkan lapak, `/api/lapak` tanpa PIN, `/perumda` & `/juri` 404.
3. Cek CI web (`gh run list`) — seharusnya hijau.
4. Fase 2 (opsional): mobile membaca QR URL/token; tombol WA `wa.me`.

## Catatan akses DB

Host direct `db.<ref>.supabase.co` hanya IPv6 dan tidak terjangkau dari mesin ini
(`getaddrinfo ENOTFOUND`). Eksekusi SQL lewat **Supabase SQL Editor** di browser (sesi login user),
atau butuh connection string **pooler IPv4**.
