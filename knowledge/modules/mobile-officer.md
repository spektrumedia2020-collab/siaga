# Modul — Mobile Officer (Flutter)

Path: `mobile/` · App: `siaga_officer` · Status: **VERIFIED** (analyze + test) · 2026-11-02

## Tanggung jawab

Aplikasi petugas lapangan: scan QR lapak, catat transaksi retribusi, cetak struk,
setoran ke bendahara, ringkasan & riwayat, mode offline.

> **Absensi dihapus 2026-11-05** atas permintaan pemilik karena presensi ditangani aplikasi
> terpisah. Halaman, rute `/attendance`, menu dashboard/landing, antrean sync, tabel lokal,
> izin lokasi, dan dependensi `geolocator` sudah dibuang. Tabel `attendance` **di server tetap ada**
> (dipakai aplikasi lain) dan tidak disentuh.

## Stack

Flutter (Dart ^3.12) · supabase_flutter · flutter_riverpod · go_router · dio · sqflite ·
connectivity_plus · mobile_scanner · pdf + printing · image_picker ·
flutter_dotenv · share_plus · intl · uuid.

## Struktur

| Path | Isi |
|---|---|
| `lib/main.dart` | Load `.env`, init Supabase, `ProviderScope` |
| `lib/config/router.dart` | `go_router` + route guard (`RouterNotifier` listen `onAuthStateChange`) |
| `lib/core/` | `providers.dart`, `theme/app_theme.dart`, `ui_helpers.dart` |
| `lib/features/` | splash, landing, auth/login, dashboard, scan, transaction, lapak, payment, receipt, shop, summary, history, reconciliation, setoran |
| `lib/services/` | `supabase_service`, `auth_service`, `stall_repository`, `local/database_service` (sqflite v2), `sync_service`, `market_cache_service`, `offline_sync_coordinator` |
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
5. **Fase 2 (2026-11-02)**: cicilan tagihan ikut outbox (`kind=BILL_PAYMENT`, dikirim lewat
   `pay_retribution_bills` dengan `p_client_uuid` sehingga pengiriman ulang tidak menagih dua kali).
   Memerlukan **migration 027**; sebelum migration dijalankan, pembayaran tagihan offline
   akan berstatus `failed` (bisa dicoba ulang lewat Sinkron setelah migrasi).
6. **Masih online-only**: setoran (butuh unggah foto bukti) dan penagihan periode berjalan.
7. **Setoran per petugas**: total setoran dihitung dari `transactions` dengan filter
   `market_id` + `officer_id = users.id_user` (dipetakan dari `auth_uid`), bukan seluruh
   transaksi pasar. Berlaku di `setoran_page` (ringkasan harian) dan `setoran_form_dialog`.
7. **Dual schema**: repository mencoba tabel baru (`stalls`, `stall_owners`) lalu fallback ke
   legacy (`lapak`, `pemilik_lapak`).
8. `transactions.amount` adalah kolom tunggal (fallback multi-kolom sudah dihapus per TODO_FIXES).
9. Validasi market↔stall diandalkan pada trigger DB (status `UNKNOWN`).

## Scan QR (2026-11-04)

- `ScanPage` dan `BottomScanPage` langsung membuka `/lapak/<kode>` saat kode valid pertama terdeteksi
  (tanpa tombol "Temukan Lapak"). Navigasi dijadwalkan lewat `addPostFrameCallback` dan dijaga
  `_isNavigating` + perbandingan kode agar frame deteksi berulang tidak membuka halaman berkali-kali.
- Getaran tetap menjadi umpan balik; teks bawah berubah menjadi "Membuka lapak <kode>...".

## Tab Retribusi lapak (2026-11-05)

- Urutan bagian: **Retribusi Harian** → **Retribusi Lain** → peringatan tagihan periode → **Tagihan**.
- **Retribusi Lain** memuat semua jenis non-harian, termasuk jenis yang ditagih berkala dan tidak
  punya tarif harian (mis. **Jaspro**). Karena `retributionTypes` hanya berisi jenis dengan tarif
  non-periode, kartu Jaspro dibentuk dari `billTypeNames` (nama jenis pada tagihan) dengan kode
  "Tagihan berkala".
- Kartu jenis yang punya tagihan menampilkan **Sisa Rp <outstanding>** dan membuka dialog bayar per
  jenis (`_openBillPayment(typeId)`); kartu yang sudah lunas menjadi nonaktif berlabel **Lunas**.
- Tombol **Bayar / Cicil Tagihan** di bagian Tagihan tetap ada untuk membayar semua tagihan sekaligus.
- Dialog pembayaran memakai `AlertDialog(scrollable: true)` selebar 400 dipadu `Column` berjarak 12
  (OutlinedInputBorder) dan kartu ringkasan sisa tunggakan; aman saat keyboard terbuka dan tidak
  tumpang tindih.

## Skema lokal `siaga_offline.db` (versi 2)

- `outbox(client_uuid PK, kind, market_id, stall_id, rate_id, types_id, officer_id, amount,
  payment_method, payer_name, note, occurred_at, stall_code, stall_label, status, attempts,
  next_attempt_at, last_error, server_id, created_at)` — kind `DAILY_PAYMENT|BILL_PAYMENT`,
  status `pending|done|failed`.
- `cache_stalls`, `cache_rates`, `cache_types`, `cache_bills`, `cache_paid_today`, `cache_meta`.
- Versi 3 menambah `outbox.types_id`; migrasi v1→v2 memindahkan baris
  `transactions` yang belum sinkron ke outbox lalu menghapus tabel lama.
- Tabel `attendance` lokal tidak lagi dibuat sejak 2026-11-05 (fitur absensi dihapus). Basis data
  lama di perangkat yang masih memuat tabel itu dibiarkan apa adanya; tidak ada data yang dihapus
  otomatis.

## SQL & migrasi

`mobile/migrations/001_init.sql` (konsolidasi tabel inti), `003_rls_policies.sql`,
`mobile/assets/sql/*` (banyak file ad-hoc/duplikat) — lihat [database/SCHEMA.md](../database/SCHEMA.md).

## Known issues

- **Batas offline Fase 2**: setoran (unggah foto) masih online-only; penugasan sektor tidak
  ditegakkan saat offline; dua perangkat bisa menagih lapak sama pada hari yang sama saat
  sama-sama offline — server baru mendeteksi saat sinkron (tidak ada UNIQUE harian).
- Antrean tagihan/presensi membutuhkan migration 027; sebelum dijalankan, baris tagihan offline
  berakhir `failed` dan presensi tetap lokal (dapat disinkronkan setelah migrasi).
- Riwayat offline hanya menampilkan transaksi yang masih di outbox, bukan riwayat server.
- Cache master menghapus data pemilik (NIK/HP) saat logout; outbox sengaja dipertahankan.
- Sumber SQL ganda di `assets/sql` vs `migrations` (drift risk).
- Ketergantungan fallback tabel legacy membuat migrasi skema tidak bisa langsung menghapus tabel lama.
- `flutter analyze` bersih (0 issue) dan `flutter test` 8/8 PASS (2026-11-02);
  CI mobile menyediakan `mobile/.env` dari `.env.example` sebelum analyze.
