# Modul — Mobile Officer (Flutter)

Path: `mobile/` · App: `siaga_officer` · Status: **VERIFIED** (analyze + test) · 2026-11-02

## Tanggung jawab

Aplikasi petugas lapangan: scan QR lapak, catat transaksi retribusi, cetak struk,
absensi ber-lokasi, setoran ke bendahara, ringkasan & riwayat, mode offline.

## Stack

Flutter (Dart ^3.12) · supabase_flutter · flutter_riverpod · go_router · dio · sqflite ·
connectivity_plus · geolocator · mobile_scanner · pdf + printing · image_picker ·
flutter_dotenv · share_plus · intl · uuid.

## Struktur

| Path | Isi |
|---|---|
| `lib/main.dart` | Load `.env`, init Supabase, `ProviderScope` |
| `lib/config/router.dart` | `go_router` + route guard (`RouterNotifier` listen `onAuthStateChange`) |
| `lib/core/` | `providers.dart`, `theme/app_theme.dart`, `ui_helpers.dart` |
| `lib/features/` | splash, landing, auth/login, dashboard, scan, transaction, lapak, payment, receipt, shop, summary, attendance, history, reconciliation, setoran |
| `lib/services/` | `supabase_service`, `auth_service`, `stall_repository`, `local/database_service` (sqflite v2), `sync_service`, `market_cache_service`, `offline_sync_coordinator`, `attendance/attendance_service` |
| `lib/shared/models/` | `stall.dart`, `outbox_entry.dart` |

## Pola data

1. **Offline-first (Fase 1, 2026-11-02)**: pembayaran harian ditulis ke **outbox** lokal
   (`client_uuid` = `transactions.uuid_transaction`) lalu dikirim dengan
   `upsert(onConflict: uuid_transaction, ignoreDuplicates: true)` sehingga pengiriman ulang
   idempoten tanpa kolom/migrasi server baru.
2. **Cache master pasar** (`market_cache_service`): lapak+pemilik+sektor, jenis retribusi,
   tarif (termasuk irama), tagihan, dan penanda "sudah bayar hari ini" disimpan di tabel
   `cache_*`. Dipakai untuk membuka lapak/scan dan menagih saat tidak ada sinyal; disegarkan
   otomatis bila lebih dari 6 jam atau lewat tombol Sinkron.
3. **Sinkron otomatis** (`offline_sync_coordinator`): listener `Connectivity.onConnectivityChanged`,
   lifecycle `resumed`, timer 2 menit, dan percobaan langsung setelah menyimpan. Error jaringan
   di-retry dengan backoff 30 dtk → 30 mnt; error validasi (RLS/trigger) ditandai `failed`,
   dicoba ulang saat Sinkron manual.
4. **Anti dobel harian**: cek cache pembayaran hari ini + outbox lokal sebelum menagih; cek
   server tetap dijalankan bila online.
5. **Batas Fase 1**: pembayaran tagihan (FIFO `pay_retribution_bills`), absensi, dan setoran
   (butuh unggah foto) masih **butuh sinyal**; halaman lapak menampilkan pesan bila offline.
6. **Dual schema**: repository mencoba tabel baru (`stalls`, `stall_owners`) lalu fallback ke
   legacy (`lapak`, `pemilik_lapak`).
7. `transactions.amount` adalah kolom tunggal (fallback multi-kolom sudah dihapus per TODO_FIXES).
8. Validasi market↔stall diandalkan pada trigger DB (status `UNKNOWN`).

## Skema lokal `siaga_offline.db` (versi 2)

- `outbox(client_uuid PK, kind, market_id, stall_id, rate_id, officer_id, amount, payment_method,
  payer_name, note, occurred_at, stall_code, stall_label, status, attempts, next_attempt_at,
  last_error, server_id, created_at)` — status `pending|done|failed`.
- `cache_stalls`, `cache_rates`, `cache_types`, `cache_bills`, `cache_paid_today`, `cache_meta`.
- `attendance` (lama, belum masuk outbox — Fase 2).
- Migrasi v1→v2 memindahkan baris `transactions` yang belum sinkron ke outbox lalu menghapus
  tabel lama; `onCreate` membuat semua tabel idempoten.

## SQL & migrasi

`mobile/migrations/001_init.sql` (konsolidasi tabel inti), `003_rls_policies.sql`,
`mobile/assets/sql/*` (banyak file ad-hoc/duplikat) — lihat [database/SCHEMA.md](../database/SCHEMA.md).

## Known issues

- **Batas offline Fase 1**: penugasan sektor tidak ditegakkan saat offline (cache berisi seluruh
  pasar), dan dua perangkat bisa menagih lapak yang sama pada hari yang sama saat
  sama-sama offline — server baru mendeteksi saat sinkron (tidak ada UNIQUE harian).
- Riwayat offline hanya menampilkan transaksi yang masih di outbox, bukan riwayat server.
- Absensi & setoran belum masuk outbox; setoran juga butuh unggah foto.
- Cache master menghapus data pemilik (NIK/HP) saat logout; outbox sengaja dipertahankan.
- Sumber SQL ganda di `assets/sql` vs `migrations` (drift risk).
- Ketergantungan fallback tabel legacy membuat migrasi skema tidak bisa langsung menghapus tabel lama.
- `flutter analyze` bersih (0 issue) dan `flutter test` 8/8 PASS (2026-11-02);
  CI mobile menyediakan `mobile/.env` dari `.env.example` sebelum analyze.
