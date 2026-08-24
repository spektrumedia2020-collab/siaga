# 📁 Konsolidasi SQL Migrations — SIAGA

> **Item audit 3.13** — Menggabungkan 30+ file SQL yang tersebar di `mobile/assets/sql/`
> menjadi struktur `migrations/` yang berurutan, mudah di-deploy & di-rollback.

---

## 🎯 Struktur Target

```
mobile/migrations/
├── README.md              ← file ini (panduan + mapping)
├── 001_init.sql           ← CREATE TABLE semua tabel inti + index
├── 002_seed.sql           ← INSERT seed data (roles, markets, sectors, stalls, dll)
├── 003_rls_policies.sql   ← RLS policy + trigger + function
├── 004_fixes.sql          ← Migrasi kolom & perbaikan skema (amount, id_user, dll)
└── 005_cleanup.sql        ← Deduplikasi & pembersihan data
```

---

## 🔄 Mapping File Lama → File Baru

### 001_init.sql (CREATE TABLE + INDEX)
| File lama | Tabel |
|-----------|-------|
| `create_officers_table.sql` | `officers` |
| `create_attendance_table.sql` | `attendance` |
| `create_stall_categories_table.sql` | `stall_categories` |
| `create_setoran_table.sql` | `setoran` |
| `create_market_config_table.sql` | `market_config` |
| `create_announcements_table.sql` | `announcements` |
| `retribution_rates_table.sql` | `retribution_rates` |
| `retribution_types_clean.sql` | `retribution_types` |
| `stalls_seed.sql` (bagian CREATE) | `stalls` |
| `sectors_seed.sql` (bagian CREATE) | `sectors` |
| `stall_owners_seed.sql` (bagian CREATE) | `stall_owners` |

### 002_seed.sql (INSERT data)
| File lama | Isi |
|-----------|-----|
| `officers_seed.sql` | Data officers |
| `stalls_seed.sql` (bagian INSERT) | Data stalls |
| `sectors_seed.sql` (bagian INSERT) | Data sectors |
| `stall_owners_seed.sql` (bagian INSERT) | Data stall_owners |
| `retribution_types_seed.sql` | Data retribution_types |
| `retribution_rates_seed.sql` | Data retribution_rates |
| `seed_rates_for_all_stalls.sql` | Seed rate semua stalls |

### 003_rls_policies.sql (RLS + TRIGGER + FUNCTION)
| File lama | Isi |
|-----------|-----|
| `fix_transactions_insert_rls.sql` | Policy INSERT transactions + trigger `trg_validate_transaction_market` |
| `fix_transactions_rls.sql` | Policy SELECT/UPDATE transactions |
| `fix_types_rls.sql` | Policy retribution_types |
| `add_delete_policy_retribution_rates.sql` | Policy DELETE retribution_rates |
| `supabase_functions.sql` (root) | Function & trigger umum |
| `supabase_storage_policy.sql` (root) | Policy storage |

### 004_fixes.sql (Migrasi kolom & perbaikan)
| File lama | Isi |
|-----------|-----|
| `migrate_transactions_amount.sql` | `total_amount` → `amount` |
| `add_market_id_to_transactions.sql` | Tambah `market_id` di transactions |
| `add_officer_id_to_sectors.sql` | Tambah `officer_id` di sectors |
| `add_category_id_to_stalls.sql` | Tambah `category_id` di stalls |
| `add_attendance_location_columns.sql` | Tambah kolom lokasi attendance |
| `add_attendance_officer_name.sql` | Tambah `officer_name` attendance |
| `add_attendance_status.sql` | Tambah `status` attendance |
| `add_avatar_url_to_users.sql` | Tambah `avatar_url` users |
| `retribution_types_add_columns.sql` | Tambah kolom retribution_types |
| `attendance_migration.sql` | Migrasi attendance |
| `combined_migration.sql` | Migrasi gabungan |
| `db_migration_and_cleanup.sql` | Migrasi + cleanup |

### 005_cleanup.sql (Deduplikasi & pembersihan)
| File lama | Isi |
|-----------|-----|
| `deduplicate_retribution_rates.sql` | Hapus rate duplikat |
| `remove_duplicates.sql` | Hapus data duplikat |
| `db_cleanup.sql` | Pembersihan DB |
| `check_rates.sh` | Script cek rate |

---

## 🚀 Cara Menggunakan

### Opsi A — Deploy penuh (fresh install)
```bash
# Jalankan berurutan di Supabase SQL Editor:
# 1. 001_init.sql
# 2. 002_seed.sql
# 3. 003_rls_policies.sql
# 4. 004_fixes.sql
# 5. 005_cleanup.sql
```

### Opsi B — Deploy inkremental (DB sudah ada)
```bash
# Hanya jalankan file yang belum dieksekusi.
# Semua file menggunakan IF NOT EXISTS / DROP IF EXISTS → idempoten.
```

### Opsi C — Via Supabase CLI
```bash
supabase db push
# atau
supabase db reset
```

---

## ⚠️ Catatan Penting
1. **Jangan hapus `mobile/assets/sql/`** sampai semua tim mengonfirmasi migrasi sukses di production.
2. File di `assets/sql/` tetap dipertahankan sebagai **referensi & backup**.
3. Semua file konsolidasi **idempoten** (aman dijalankan ulang).
4. Urutan eksekusi **penting** (tabel dulu, baru seed, lalu RLS, lalu fix).