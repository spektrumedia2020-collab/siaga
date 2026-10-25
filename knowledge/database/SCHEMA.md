# SCHEMA — Supabase Postgres

Status: **PARTIAL** — hanya tabel yang definisinya ada di repo yang **VERIFIED**; sisanya `INFERRED`
dari query kode. Status terpasang di DB produksi: **UNKNOWN** (tidak ada akses DB pada sesi ini).

## Sumber SQL (A-04: tersebar)

| Lokasi | Isi |
|---|---|
| `mobile/migrations/001_init.sql` | officers, attendance, stall_categories, setoran, market_config, announcements |
| `mobile/migrations/003_rls_policies.sql` | RLS officers/attendance/setoran/market_config/announcements/transactions |
| `mobile/assets/sql/*.sql` | varian lebih lama + tambahan kolom + policy (banyak duplikat) |
| `migrations/004–006` | market_sectors, edit market oleh head, alamat terstruktur |
| root `*.sql` | `create_user_roles_table.sql`, `supabase_functions.sql`, `supabase_storage_policy.sql`, seed, fix FK, import CSV |
| Supabase dashboard | `markets`, `stalls`, `transactions`, `users`, `roles` awal — **tidak** ada DDL di repo |

## Tabel

### Didefinisikan di repo (VERIFIED)

| Tabel | Kolom kunci | Catatan RLS |
|---|---|---|
| `roles` | `id`, `name` UNIQUE | — |
| `user_roles` | `id`, `user_id`→auth.users, `role_id`→roles, `market_id`→markets | SELECT: sendiri/admin; INSERT/UPDATE/DELETE: admin (migration 007) |
| `officers` | `id`, `user_id` UNIQUE, `market_id`, `name` | select own / auth; insert/update own |
| `attendance` | `id`, `officer_id`, `market_id`, `check_in`, `check_out` (+ kolom lokasi via `add_attendance_location_columns.sql`) | select own/auth; insert/update own |
| `stall_categories` | `id`, `name`, `description` | `UNKNOWN` |
| `setoran` | `id` UUID, `officer_id`, `market_id`, `total_amount`, `transaction_count`, `note`, `proof_image_url`, `status` CHECK(`pending_treasurer`,`pending_head`,`approved`,`rejected`), `rejection_reason`, `approved_by_treasurer`, `approved_by_head`, `approved_at_*` | select/insert officer; update approval |
| `market_config` | `id`, `market_id`, `key`, `value`, UNIQUE(market_id,key) | read authenticated; tulis oleh petugas pasar |
| `announcements` | `id`, `market_id`, `title`, `content`, `priority`, `is_active`, `start_date`, `end_date`, `created_by`→users.id_user | read authenticated; kelola oleh petugas pasar |
| `retribution_rates` | `id`, `amount`, `stall_id`→stalls, `market_id`→markets, `types_id`→retribution_types | SELECT authenticated; INSERT/UPDATE/DELETE admin atau staf pasar terkait (migration 008) |
| `market_sectors` | `market_id`, (+ `officer_id`), kolom sektor | select authenticated; tulis ADMIN / MARKET_HEAD pasar terkait (`migrations/004`) |
| `market_themes` | **tidak ada di schema `public`** (audit 2026-10-25); dirujuk `ThemeManagement.tsx` | — |

### Direferensikan kode, DDL tidak ada di repo (INFERRED)

| Tabel | Kolom terverifikasi dari query | Dipakai di |
|---|---|---|
| `markets` | `id`, `code`, `name`, `status`, `city`, `address`, `street`, `street_number`, `kecamatan`, `province`, `postal_code`, `photo_url`, `head_photo_url`, `logo_url`, `id_head_market`, `slug` (untuk `/@slug`) | `api/lapak.ts`, `roleUtils.ts`, migration 004/005 |
| `stalls` | `id`, `market_id`, `code`, `number`, `qr_code`, `status`, `sector_id`, `owner_id`, `category_id` | `api/lapak.ts`, `api/perumda.ts`, web |
| `transactions` | `id`, `market_id`, `stall_id`, `amount`, `status` (`paid` = lunas), `transaction_date`, `created_at` | `api/perumda.ts`, mobile |
| `users` | `id_user`, `nama`, `username`, `email`, `no_hp`, `status`, `akses_global`, `id_role`, `market_id`, `auth_uid`, `avatar_url` | `api/users.ts`, `roleUtils.ts`, SQL |
| `stall_owners` | `id`, `name`, `phone` (`INFERRED`) | `OwnersPage`, `StallsPage` |
| `retribution_types` | `id`, `name` (`INFERRED`) | master tarif |
| `lapak` (legacy) | `id_lapak`, `id_pemilik`, `kode_lapak`, `nomor_lapak` | **tidak ada di DB** (audit 2026-10-25); dirujuk `mobile/lib/services/stall_repository.dart:41`, `payment_page.dart:75` |
| `pemilik_lapak` (legacy) | `id_pemilik`, `nama_pemilik` | **tidak ada di DB**; dirujuk `stall_repository.dart:84`, `payment_page.dart:91` |

> `avatars` **bukan tabel** — itu nama bucket Supabase Storage.

## Helper DB

- `is_current_user_admin()` — dipakai policy `market_sectors` (`migrations/004`).
- `trg_validate_transaction_market` — klaim validasi market pada insert transaksi
  (disebut `TODO_FIXES.md`; keberadaan di DB `UNKNOWN`).

## Audit RLS produksi — 2026-10-25 (P0-05)

Sumber: query langsung `pg_class` + `pg_policies` di Supabase SQL Editor
(project `hlvsbmxpkqvniemunygh`). **VERIFIED**. Total: 16 tabel `public`, 46 policy.

| Tabel | RLS | Policy | Verdict |
|---|---|---|---|
| `announcements` | ON | 2 | OK — read authenticated; tulis market-scoped (ADMIN/HEAD/TREASURER) |
| `attendance` | ON | 4 | **PARTIAL** — own insert/update, tetapi `attendance_select` `true` → semua user login bisa baca absensi semua |
| `market_config` | ON | 3 | OK — read authenticated; tulis market-scoped |
| `market_sectors` | ON | 5 | OK — read everyone; tulis admin/head |
| `markets` | ON | 4 | OK — read everyone (landing publik); tulis admin/head |
| `officers` | ON | 4 | **PARTIAL** — `officers_select_auth` `true` → semua user login baca semua petugas |
| `retribution_rates` | ON | 4 | OK — migration 008 |
| `retribution_types` | ON | 2 | **PARTIAL** — INSERT `true` → user login bisa menambah tipe retribusi |
| `roles` | ON | 1 | OK — read everyone |
| `setoran` | ON | 3 | **PARTIAL** — cek peran hanya `users.id_role` (bukan `user_roles`) dan tidak dibatasi market |
| `stall_categories` | **OFF** | 0 | **OPEN** — RLS tidak aktif, 0 policy |
| `stall_owners` | ON | 1 | **OPEN** — `ALL` `true`/`true` → semua user login kelola semua pemilik |
| `stalls` | ON | 2 | **OPEN** — `ALL` `true`/`true` (+ SELECT publik) → semua user login kelola semua lapak |
| `transactions` | ON | 3 | **OPEN** — INSERT/UPDATE `true`, SELECT `true` → semua transaksi bisa dibaca & diubah |
| `user_roles` | ON | 4 | OK — migration 007 |
| `users` | ON | 4 | **CRITICAL** — SELECT/INSERT/UPDATE `true` → baca semua profil & ubah `id_role` sendiri (eskalasi ADMIN) |

### Yang tidak ada di DB (padahal dirujuk kode)

- `lapak`, `pemilik_lapak` (legacy fallback mobile) — **tidak ada** di schema `public`.
- `market_themes` (`ThemeManagement.tsx`) — **tidak ada** di schema `public`.

Implikasi: fallback mobile ke tabel legacy akan gagal; halaman Theme Management akan error.

## Ringkasan RLS

| Status | Tabel |
|---|---|
| Memadai | `markets`, `market_sectors`, `market_config`, `announcements`, `roles`, `user_roles` (007), `retribution_rates` (008) |
| Perlu ditutup | `users` (CRITICAL), `transactions`, `stalls`, `stall_owners`, `stall_categories` (RLS off) |
| Perlu dipersempit | `attendance`, `officers`, `retribution_types`, `setoran` |
