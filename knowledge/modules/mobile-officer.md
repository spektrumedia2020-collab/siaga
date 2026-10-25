# Modul — Mobile Officer (Flutter)

Path: `mobile/` · App: `siaga_officer` · Status: **VERIFIED** (struktur & pubspec) · 2026-10-25

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
| `lib/services/` | `supabase_service`, `auth_service`, `stall_repository`, `local/database_service` (sqflite), `sync_service`, `attendance/attendance_service` |
| `lib/shared/models/` | `stall.dart` |

## Pola data

1. **Offline-first**: transaksi/absensi dapat disimpan lokal lalu disinkronkan (`sync_service`).
2. **Dual schema**: repository mencoba tabel baru (`stalls`, `stall_owners`) lalu fallback ke
   legacy (`lapak`, `pemilik_lapak`).
3. `transactions.amount` adalah kolom tunggal (fallback multi-kolom sudah dihapus per TODO_FIXES).
4. Validasi market↔stall diandalkan pada trigger DB (status `UNKNOWN`).

## SQL & migrasi

`mobile/migrations/001_init.sql` (konsolidasi tabel inti), `003_rls_policies.sql`,
`mobile/assets/sql/*` (banyak file ad-hoc/duplikat) — lihat [database/SCHEMA.md](../database/SCHEMA.md).

## Known issues

- Sumber SQL ganda di `assets/sql` vs `migrations` (drift risk).
- Ketergantungan fallback tabel legacy membuat migrasi skema tidak bisa langsung menghapus tabel lama.
- `flutter analyze` belum diverifikasi ulang pada sesi ini; klaim 0 error berasal dari TODO_FIXES (23 Agu 2026) — **STALE/UNVERIFIED**.
