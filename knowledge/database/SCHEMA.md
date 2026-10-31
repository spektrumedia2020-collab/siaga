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
| `stalls` | `id`, `market_id`, `code`, `number`, `qr_code`, `legacy_code` (text, nullable, terpasang di prod lewat migration 018 — kode lapak sistem lama, bukan kunci), `public_token` (unique, 32 hex), `status`, `sector_id`, `owner_id`, `category_id` | `api/lapak.ts`, web |
| `transactions` | `id`, `market_id`, `stall_id`, `amount`, `status` (`paid` = lunas), `transaction_date`, `created_at` | web, mobile |
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
(project `hlvsbmxqvniemunygh`). **VERIFIED**. Total: 16 tabel `public`, 46 policy.

> **Model akses (migration 014, 2026-10-25):** ADMIN satu-satunya penulis master/operasional.
> MARKET_HEAD **read-only**. Pengecualian: OFFICER insert transaksi/absensi/setoran miliknya;
> TREASURER update setoran pasar; user update profil sendiri.

> **Status data (2026-10-26):** seluruh data operasional **dikosongkan** (wipe terkonfirmasi).
> Tersisa 1 akun `admin@siaga.id` dan 4 `roles`. `retribution_types`, `retribution_rates`, dan
> `stall_categories` juga dikosongkan pada 2026-10-26. Storage: 0 objek.
> Lihat [DONE.md](../tasks/DONE.md).

| Tabel | RLS | Policy | Verdict |
|---|---|---|---|
| `announcements` | ON | 2 | OK — 014: read authenticated; tulis ADMIN |
| `attendance` | ON | 4 | OK — 012: own + admin/kepala pasar; select-wide dihapus |
| `market_config` | ON | 3 | OK — 014: read authenticated; tulis ADMIN |
| `market_sectors` | ON | 5 | OK — 014: read everyone; tulis ADMIN |
| `markets` | ON | 4 | OK — 014: read everyone (landing publik); tulis ADMIN |
| `officers` | ON | 4 | OK — 012: own/admin/staf pasar yang sama |
| `retribution_rates` | ON | 4 | OK — 008 + 014: SELECT authenticated; tulis ADMIN |
| `retribution_types` | ON | 2 | OK — 014: SELECT authenticated; INSERT ADMIN; UPDATE/DELETE tanpa policy |
| `roles` | ON | 1 | OK — read everyone |
| `setoran` | ON | 3 | OK — 012 + 014 + 015: insert own; update ADMIN; head read-only |
| `stall_categories` | ON | 4 | OK — 014: read authenticated; tulis ADMIN |
| `stall_owners` | ON | 4 | OK — 010/013/014: anon hanya `id,name`; baca staff penuh; tulis ADMIN |
| `stalls` | ON | 4 | OK — 010 + 014: SELECT publik; tulis ADMIN |
| `transactions` | ON | 3 | OK — 010 + 014: INSERT market member (petugas); SELECT market-scoped; UPDATE ADMIN |
| `user_roles` | ON | 4 | OK — migration 007 |
| `users` | ON | 3 + trigger | OK — 009 + 014: INSERT ADMIN; UPDATE own/ADMIN; trigger admin-only |

### Yang tidak ada di DB (padahal dirujuk kode)

- `lapak`, `pemilik_lapak` (legacy fallback mobile) — **tidak ada** di schema `public`.
- `market_themes` (`ThemeManagement.tsx`) — **tidak ada** di schema `public`.

Implikasi: fallback mobile ke tabel legacy akan gagal; halaman Theme Management akan error.

## Tagihan tahunan & cicilan (migration 020)

`migrations/020_retribution_annual_bills.sql` — **status 2026-10-31: file siap, menunggu dijalankan pemilik
di SQL Editor Supabase**. Halaman `#market/dashboard/bills` menampilkan pesan "belum aktif" selama ini.

- `retribution_types.billing_period` (`HARIAN|BULANAN|TAHUNAN`, backfill dari `unit` + `name`) dan
  `allow_installment` (default true untuk TAHUNAN).
- `retribution_bills(id, market_id, stall_id, types_id, period_year, amount_due, due_date, status,
  note, created_at, updated_at)`, UNIQUE `(stall_id, types_id, period_year)`, status `AKTIF|DIBATALKAN`.
- `transactions.bill_id` → `retribution_bills` (`ON DELETE SET NULL`) dan `transactions.period_year`.
- View `retribution_bill_balances` (`security_invoker = true`): `amount_paid` = jumlah transaksi
  ber-`bill_id` dengan status `paid`/`LUNAS`; `outstanding`; `status` (`LUNAS`/`CICILAN`/`BELUM_LUNAS`/
  `DIBATALKAN`); `is_open`.
- `generate_retribution_bills(p_market_id, p_year, p_types_id, p_due_date)` — terbitkan tagihan dari
  `retribution_rates` **per lapak** (harga boleh beda tiap lapak); idempoten `ON CONFLICT DO NOTHING`.
- `pay_retribution_bills(p_stall_id, p_amount, p_types_id, p_payment_method, p_payer_name, p_note)` —
  alokasi FIFO tahun terlama lebih dulu, satu pembayaran bisa menutup beberapa tahun; bila uang melebihi
  total tunggakan seluruh insert dibatalkan (`RAISE EXCEPTION`).
- Trigger `guard_transaction_bill` (transactions): tolak pembayaran melebihi sisa, paksa `period_year`
  dari tagihan, pastikan lapak & pasar sama.
- RLS `retribution_bills`: SELECT `authenticated`; INSERT/UPDATE/DELETE admin penuh atau anggota pasar.

Tunggakan tidak digabung ke tagihan tahun baru: tagihan tiap tahun tetap terpisah, dan pembayaran
melunasi tahun terdahulu lebih dulu (FIFO). Ringkasan "Tunggakan tahun lalu" dihitung dari sisa
tagihan dengan `period_year` < tahun yang dipilih.

## Ringkasan RLS

| Status | Tabel |
|---|---|
| Memadai | `markets`, `market_sectors`, `market_config`, `announcements`, `roles`, `user_roles` (007), `retribution_rates` (008), `users` (009), `transactions`/`stalls`/`stall_owners` (010 + 013), `stall_categories` (011), `attendance`/`officers`/`retribution_types`/`setoran` (012), `retribution_bills` (020) |
