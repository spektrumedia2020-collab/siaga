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
| 4 | Sprint 0 — PIN lapak & Perumda secret | **SEBAGIAN** | PIN fail-closed selesai; fitur Perumda dihapus |
| 18 | ~~P0-04 — Perumda secret~~ | **DIHAPUS** | Fitur Perumda dihapus (admin = Perumda) |
| 19 | Full data wipe (DB + storage) | **SELESAI** | Data 0; tersisa 1 admin; master & roles dipertahankan |
| 20 | P1-05 — hijaukan typecheck/CI | **SELESAI** | `tsc --noEmit` 0 error; script `typecheck` ditambah |
| 21 | Hapus halaman juri (`/juri`, `/docs`) | **SELESAI** | Komponen + route dihapus; build/typecheck PASS |
| 22 | Hapus data retribusi & kategori lapak | **SELESAI** | types/rates/categories = 0 |
| 23 | Fase 1 token QR publik lapak | **SELESAI (kode+DB)** | Token + halaman publik + QR pemilik; PIN dihapus |
| 14 | P0-03 — env PIN lapak + deploy | **BELUM** | `PUBLIC_STALL_PIN_HASH` diset; produksi `1234` = 401 |
| 15 | Role: MARKET_HEAD read-only + hapus impersonation | **SELESAI (DB+kode)** | Migration 014 applied; build PASS; deploy tertunda |
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

- Knowledge, kode aplikasi, migration DB, dan wipe data produksi (dengan konfirmasi user).

## Blocker

- Deploy tertunda: `PUBLIC_STALL_PIN_HASH` + `PERUMDA_JWT_SECRET` belum diset di Vercel.
- Rotasi password `admin@siaga.id` belum dilakukan (password lama pernah bocor).

## Team Waves

Tidak ada gelombang paralel. `open_wave = null`.

## Next Session Handoff

1. Baca urutan resume: `state.json` → `index/index-state.json` → `context.md` → `memory.md` → `00_INDEX.md` → berkas ini.
2. **Rotasi password `admin@siaga.id`** (Supabase Auth) — satu-satunya akun tersisa; password lama bocor.
3. Set `PUBLIC_STALL_PIN_HASH` + `PERUMDA_JWT_SECRET` di Vercel, lalu push 6 commit & deploy.
4. Setelah deploy: verifikasi `pin=1234` → 401, Perumda login, head read-only, tanpa menu bendahara,
   `/juri` tanpa kredensial.
5. Data produksi kosong (0 pasar/lapak/transaksi). Bila ingin mulai operasional, impor ulang data
   pasar dari CSV di root repo atau buat lewat dashboard admin.
6. CI merah karena `tsc --noEmit` (40+ error lama). Perbaiki bertahap; jangan tutup dengan CI merah
   tanpa catatan.
