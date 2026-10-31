# Modul — Backend API (Express + Vercel Functions)

Status: **VERIFIED** · 2026-10-25

## Dua lapisan yang hidup bersamaan

| Lapisan | Lokasi | Deploy | Auth | Client DB |
|---|---|---|---|---|
| Express | `src/server.ts`, `src/routes/*`, `src/middleware/auth.ts` | **tidak** (hanya `npm run server`) | `authenticateToken` (+`requireAdmin`) | service role |
| Vercel functions | `api/*.ts` | ya (`vercel.json` builds+routes) | per-endpoint | service role |

Konsekuensi: perbaikan keamanan **harus** dilakukan di `api/*.ts` untuk produksi; Express hanya relevan
untuk pengembangan lokal/self-host.

## Express

- Middleware: helmet, rate-limit 100/15m, CORS allowlist, JSON 10mb.
- Router: `markets` (CRUD), `officers` (list per pasar, create), `stalls` (list per pasar, create),
  `transactions` (list per pasar, create), `users` (create, list, market-heads, delete — ADMIN).
- `authenticateToken` → `supabaseAdmin.auth.getUser(token)` → `req.user`.
- `checkRole` → baca `user_roles` + join `roles`, bandingkan uppercase.

## Vercel functions

| Fungsi | Ringkas | Risiko |
|---|---|---|
| `users.ts` | create/list/delete user (service role) | auth + role `ADMIN` + CORS allowlist (S-01 FIXED di kode, menunggu deploy) |
| `lapak.ts` | info lapak publik; wajib PIN pemilik (default `7777`, hash bcrypt) | 401 tanpa/salah PIN; 503 bila migration 022 belum ada; rate limit 60/menit |
| `perumda.ts` | login PIN 6 → JWT; agregat laporan | secret fallback (S-04) |

## Aturan perubahan

1. Jangan menambah endpoint baru dengan service role tanpa verifikasi identitas + peran.
2. Jangan menyalin logika Express ke Vercel (atau sebaliknya) tanpa menandai sumber tunggal.
3. Setiap perubahan kontrak respons harus disinkronkan ke `api/API.md`.
4. CORS: gunakan allowlist, bukan `*`, untuk endpoint yang menyentuh data pribadi.

## Tindak lanjut

- P1-01: putuskan konsolidasi (hapus `api/` atau jadikan satu-satunya backend).
- P0-01/02/03/04/06: lihat [tasks/BACKLOG.md](../tasks/BACKLOG.md).
