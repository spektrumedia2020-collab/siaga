# CURRENT — Task Aktif

**Sesi:** SESSION-2026-10-25-1 · **Update:** 2026-10-25T20:05:00+07:00 · **Branch:** `main` @ `73c7267`

## Status

`WIP` — knowledge root selesai diinisialisasi; pekerjaan berikutnya menunggu keputusan user.

## Task

| # | Task | Status | DoD |
|---|---|---|---|
| 1 | Inisialisasi knowledge root (`knowledge/`) | **SELESAI** | Artefak wajib §2.2 ada dengan isi nyata |
| 2 | Sprint 0 — amankan `api/users.ts` | **SELESAI** | Auth ADMIN + CORS; deploy `4a0e766`; produksi 401/403 terverifikasi |
| 3 | Sprint 0 — tinjau policy `user_roles` | **SELESAI** | Migration 007 applied; 4 policy; tanpa `USING (true)` |
| 4 | Sprint 0 — hapus fallback PIN `1234` & set `PERUMDA_JWT_SECRET` | **SEBAGIAN** | Kode PIN fail-closed selesai (`6c8ea42`); env + deploy belum |
| 14 | P0-03 — env PIN lapak + deploy | **BELUM** | `PUBLIC_STALL_PIN_HASH` diset; produksi `1234` = 401 |
| 15 | Role: MARKET_HEAD read-only + hapus impersonation | **SELESAI (DB+kode)** | Migration 014 applied; build PASS; deploy tertunda |
| 16 | P0-12 — kredensial admin di halaman publik | **SEBAGIAN** | Kode & bundle bersih; rotasi password pending |
| 17 | Role: hapus TREASURER (DB + auth + UI) | **SELESAI (DB+kode)** | 2 akun & role dihapus; admin ambil alih approval |
| 5 | Verifikasi build/typecheck web | **SEBAGIAN** | `npm run build` PASS; `tsc --noEmit` masih 40+ error lama |
| 6 | Deploy + uji P0-01 di produksi | **SELESAI** | Tanpa token 401, origin asing 403; uji role belum |
| 7 | P0-06 — tutup RLS `retribution_rates` | **SELESAI** | Migration 008 applied; 4 policy terverifikasi |
| 8 | P0-05 — audit RLS produksi | **SELESAI** | 16 tabel / 46 policy; 6 temuan baru (S-11…S-16) |
| 9 | P0-07 — tutup RLS `users` | **SELESAI** | Migration 009 + trigger; uji eskalasi PASS |
| 10 | P0-08 — tutup RLS operasional | **SELESAI** | Migration 010; uji deny+allow PASS |
| 11 | P0-09 — aktifkan RLS `stall_categories` | **SELESAI** | Migration 011; anon ditolak, staf diizinkan |
| 12 | P0-10 — read scope + `setoran` | **SELESAI** | Migration 012; deny/allow PASS |
| 13 | P0-11 — PII `stall_owners` | **SELESAI** | Migration 013; anon hanya `id,name` |

## Scope sesi ini (sudah dieksekusi)

- Hanya menulis di `knowledge/**`. Kode aplikasi **tidak diubah**.
- Tidak ada commit, push, atau operasi git destruktif.

## Blocker

- Tidak ada. (Tidak dapat memverifikasi state DB produksi — hanya file SQL.)

## Team Waves

Tidak ada gelombang paralel. `open_wave = null`.

## Next Session Handoff

1. Baca urutan resume: `state.json` → `index/index-state.json` → `context.md` → `memory.md` → `00_INDEX.md` → berkas ini.
2. **P0-12 (CRITICAL)**: rotasi password akun demo (ADMIN dkk) dan hapus kolom password dari
   `JuriDocumentationPage` — halaman `/juri` & `/docs` publik.
3. **P0-03 blocker**: set `PUBLIC_STALL_PIN_HASH` di Vercel sebelum push/deploy; setelah itu push
   semua commit lokal (PIN fail-closed + role admin-only + hapus impersonation).
4. Setelah deploy: uji login MARKET_HEAD → banner baca-saja; pastikan tombol tulis ditolak/di-hide
   (P1-06); verifikasi impersonation hilang.
5. **P0-04**: set `PERUMDA_JWT_SECRET` + fail-closed.
6. CI merah karena `tsc --noEmit` (40+ error lama). Perbaiki bertahap; jangan tutup dengan CI merah
   tanpa catatan.
