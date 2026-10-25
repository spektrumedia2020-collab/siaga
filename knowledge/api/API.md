# API — SIAGA

Status: **VERIFIED** dari route definition · 2026-10-25

## 1. Express API (`src/server.ts`) — port 3001

Tidak dibangun oleh `vercel.json`; aktif hanya saat `npm run server`.

Middleware global: `helmet` → `rateLimit(100 / 15 menit / IP)` → `cors` (allowlist) →
`json({limit:'10mb'})`.

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/health` | — | inline (`src/server.ts:61`), dipasang sebelum CORS |
| GET | `/api/markets` | JWT | `markets.ts:16` — semua pasar + info kepala pasar |
| GET | `/api/markets/:id` | JWT | `markets.ts:84` |
| POST | `/api/markets` | JWT | `markets.ts:132` |
| PUT | `/api/markets/:id` | JWT | `markets.ts:206` |
| DELETE | `/api/markets/:id` | JWT | `markets.ts:294` |
| GET | `/api/officers/market/:marketId` | JWT | `officers.ts:12` |
| POST | `/api/officers` | JWT | `officers.ts:33` |
| GET | `/api/stalls/market/:marketId` | JWT | `stalls.ts:12` |
| POST | `/api/stalls` | JWT | `stalls.ts:37` |
| GET | `/api/transactions/market/:marketId` | JWT | `transactions.ts:12` |
| POST | `/api/transactions` | JWT | `transactions.ts:36` |
| POST | `/api/users/create` | JWT + `ADMIN` | `users.ts:12` |
| GET | `/api/users` | JWT + `ADMIN` | `users.ts:79` |
| GET | `/api/users/market-heads` | JWT + `ADMIN` | `users.ts:119` |
| DELETE | `/api/users/:id` | JWT + `ADMIN` | `users.ts:178` |

Catatan: router memakai **service-role client** (`src/routes/*.ts:8-12`), sehingga RLS tidak berlaku —
otorisasi sepenuhnya bergantung pada middleware. `authenticateToken` memverifikasi JWT Supabase.

## 2. Vercel functions (`api/*.ts`)

Semua mengirim `Access-Control-Allow-Origin: *`.

### `/api/users` → `api/users.ts`
Wajib `Authorization: Bearer <Supabase access token>` milik user dengan peran `ADMIN`.
Tanpa token → 401; peran tidak memenuhi → 403; origin di luar allowlist → 403.

| Method | Auth | Efek |
|---|---|---|
| GET | JWT + `ADMIN` | Daftar semua user auth + email + role |
| POST | JWT + `ADMIN` | Buat user auth + `user_roles` + `users` |
| DELETE | JWT + `ADMIN` | Hapus `user_roles`, `users`, lalu auth user |

### `/api/lapak` → `api/lapak.ts`
| Method | Auth | Body | Efek |
|---|---|---|---|
| POST | PIN 4 digit | `{marketId, code, pin}` | Info pasar + lapak (+ data terkait) |

### `/api/perumda` → `api/perumda.ts`
| Method | Auth | Body/Query | Efek |
|---|---|---|---|
| POST | PIN 6 digit (`PERUMDA_PIN`/`_HASH`) | `{pin}` | Terbitkan JWT 1 jam (`scope: perumda-report`) |
| GET | `Bearer` JWT | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Agregat laporan: revenue, tren harian, per pasar, setoran |

## 3. Route publik web (SPA, bukan API)

| Path | Komponen | Akses |
|---|---|---|
| `/@<slug>` | `MarketLandingPage` | publik (data pasar via anon + RLS) |
| `/lapak/<marketId>/<kode>` | `PublicStallPage` | PIN via `/api/lapak` |
| `/juri`, `/docs` | `JuriDocumentationPage` | publik |
| `/perumda` | `PerumdaPage` | PIN via `/api/perumda` |
| lainnya | login/dashboard | Supabase Auth |

## 4. Supabase (akses langsung klien)

Web & mobile memanggil PostgREST Supabase dengan anon key. Kontrak efektif = skema tabel + RLS
(lihat [database/SCHEMA.md](../database/SCHEMA.md)). Tidak ada layer API tambahan untuk operasi
CRUD pasar/lapak/transaksi/retribusi.

## 5. Kontrak yang perlu dijaga

- `transactions.amount` (bukan `total_amount`) — mobile sudah diseragamkan.
- `setoran.status` ∈ {`pending_treasurer`,`pending_head`,`approved`,`rejected`}.
- `users.auth_uid` wajib terisi agar role resolution & RLS bekerja.
- Format tanggal laporan Perumda: `YYYY-MM-DD`, `from <= to`.
