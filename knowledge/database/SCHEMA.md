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
| `user_roles` | `id`, `user_id`→auth.users, `role_id`→roles, `market_id`→markets | **PERMISSIF**: select/insert/update/delete `USING (true)` |
| `officers` | `id`, `user_id` UNIQUE, `market_id`, `name` | select own / auth; insert/update own |
| `attendance` | `id`, `officer_id`, `market_id`, `check_in`, `check_out` (+ kolom lokasi via `add_attendance_location_columns.sql`) | select own/auth; insert/update own |
| `stall_categories` | `id`, `name`, `description` | `UNKNOWN` |
| `setoran` | `id` UUID, `officer_id`, `market_id`, `total_amount`, `transaction_count`, `note`, `proof_image_url`, `status` CHECK(`pending_treasurer`,`pending_head`,`approved`,`rejected`), `rejection_reason`, `approved_by_treasurer`, `approved_by_head`, `approved_at_*` | select/insert officer; update approval |
| `market_config` | `id`, `market_id`, `key`, `value`, UNIQUE(market_id,key) | read authenticated; tulis oleh petugas pasar |
| `announcements` | `id`, `market_id`, `title`, `content`, `priority`, `is_active`, `start_date`, `end_date`, `created_by`→users.id_user | read authenticated; kelola oleh petugas pasar |
| `retribution_rates` | `id`, `amount`, `stall_id`→stalls, `market_id`→markets, `types_id`→retribution_types | **PERMISSIF**: select/insert/update `USING (true)` |
| `market_sectors` | `market_id`, (+ `officer_id`), kolom sektor | select authenticated; tulis ADMIN / MARKET_HEAD pasar terkait (`migrations/004`) |
| `market_themes` | `UNKNOWN` (dipakai `ThemeManagement.tsx`) | `UNKNOWN` |

### Direferensikan kode, DDL tidak ada di repo (INFERRED)

| Tabel | Kolom terverifikasi dari query | Dipakai di |
|---|---|---|
| `markets` | `id`, `code`, `name`, `status`, `city`, `address`, `street`, `street_number`, `kecamatan`, `province`, `postal_code`, `photo_url`, `head_photo_url`, `logo_url`, `id_head_market`, `slug` (untuk `/@slug`) | `api/lapak.ts`, `roleUtils.ts`, migration 004/005 |
| `stalls` | `id`, `market_id`, `code`, `number`, `qr_code`, `status`, `sector_id`, `owner_id`, `category_id` | `api/lapak.ts`, `api/perumda.ts`, web |
| `transactions` | `id`, `market_id`, `stall_id`, `amount`, `status` (`paid` = lunas), `transaction_date`, `created_at` | `api/perumda.ts`, mobile |
| `users` | `id_user`, `nama`, `username`, `email`, `no_hp`, `status`, `akses_global`, `id_role`, `market_id`, `auth_uid`, `avatar_url` | `api/users.ts`, `roleUtils.ts`, SQL |
| `stall_owners` | `id`, `name`, `phone` (`INFERRED`) | `OwnersPage`, `StallsPage` |
| `retribution_types` | `id`, `name` (`INFERRED`) | master tarif |
| `lapak` (legacy) | `id_lapak`, `id_pemilik`, `kode_lapak`, `nomor_lapak` | `mobile/lib/services/stall_repository.dart:41`, `payment_page.dart:75` |
| `pemilik_lapak` (legacy) | `id_pemilik`, `nama_pemilik` | `stall_repository.dart:84`, `payment_page.dart:91` |

> `avatars` **bukan tabel** — itu nama bucket Supabase Storage.

## Helper DB

- `is_current_user_admin()` — dipakai policy `market_sectors` (`migrations/004`).
- `trg_validate_transaction_market` — klaim validasi market pada insert transaksi
  (disebut `TODO_FIXES.md`; keberadaan di DB `UNKNOWN`).

## Ringkasan RLS

| Status | Tabel |
|---|---|
| Scoped memadai | `officers`, `attendance`, `setoran`, `market_config`, `announcements`, `market_sectors` |
| **Terlalu terbuka** | `user_roles`, `retribution_rates` |
| Belum diketahui | `markets`, `stalls`, `transactions`, `users`, `stall_owners`, `retribution_types`, `market_themes`, `stall_categories` |
