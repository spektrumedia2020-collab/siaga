# CURRENT — Task Aktif

**Sesi:** SESSION-2026-10-25-1 · **Update:** 2026-10-25T20:05:00+07:00 · **Branch:** `main` @ `73c7267`

## Status

`WIP` — knowledge root selesai diinisialisasi; pekerjaan berikutnya menunggu keputusan user.

## Task

| # | Task | Status | DoD |
|---|---|---|---|
| 1 | Inisialisasi knowledge root (`knowledge/`) | **SELESAI** | Artefak wajib §2.2 ada dengan isi nyata |
| 2 | Sprint 0 — amankan `api/users.ts` | **SELESAI** | Auth ADMIN + CORS; deploy `4a0e766`; produksi 401/403 terverifikasi |
| 3 | Sprint 0 — tinjau policy `user_roles` | **BELUM** | Tulis hanya untuk `ADMIN`; SELECT minimal sesuai kebutuhan UI |
| 4 | Sprint 0 — hapus fallback PIN `1234` & set `PERUMDA_JWT_SECRET` | **BELUM** | Env wajib diset; fallback dihapus; deploy diverifikasi |
| 5 | Verifikasi build/typecheck web | **SEBAGIAN** | `npm run build` PASS; `tsc --noEmit` masih 40+ error lama |
| 6 | Deploy + uji P0-01 di produksi | **SELESAI** | Tanpa token 401, origin asing 403; uji role belum |

## Scope sesi ini (sudah dieksekusi)

- Hanya menulis di `knowledge/**`. Kode aplikasi **tidak diubah**.
- Tidak ada commit, push, atau operasi git destruktif.

## Blocker

- Tidak ada. (Tidak dapat memverifikasi state DB produksi — hanya file SQL.)

## Team Waves

Tidak ada gelombang paralel. `open_wave = null`.

## Next Session Handoff

1. Baca urutan resume: `state.json` → `index/index-state.json` → `context.md` → `memory.md` → `00_INDEX.md` → berkas ini.
2. Lanjut **P0-02**: batasi policy `user_roles` (tulis hanya ADMIN) — `create_user_roles_table.sql`,
   verifikasi di DB via `pg_policies`.
3. Lanjut **P0-05**: audit RLS tabel inti (`markets`, `stalls`, `transactions`, `users`, dst.).
4. **P0-03/P0-04**: set `PUBLIC_STALL_PIN_HASH` dan `PERUMDA_JWT_SECRET` di env Vercel.
5. Opsional: uji produksi dengan akun non-admin (403) dan admin (201).
6. CI merah karena `tsc --noEmit` (40+ error lama). Perbaiki bertahap; jangan tutup dengan CI merah
   tanpa catatan.
