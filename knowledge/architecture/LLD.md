# LLD — Low Level Design

Status: **VERIFIED** (baca source) · 2026-10-25

## Web — entry & routing

`src/main.tsx` → `<ErrorBoundary>` → `App`.

Route ditentukan di `src/App.tsx:163-200`:

| Kondisi URL | Route | Komponen | Guard |
|---|---|---|---|
| pathname `/@<slug>` | `market-landing` | `MarketLandingPage` | publik |
| pathname `/lapak/<marketId>/<kode>` | `public-stall` | `PublicStallPage` | PIN (API) |
| pathname `/juri` atau `/docs` | `juri-docs` | `JuriDocumentationPage` | publik |
| pathname `/perumda` | `perumda` | `PerumdaPage` | PIN 6 digit → JWT (API) |
| belum login | `login` | `Auth` | — |
| role pasar (HEAD/ADMIN_PASAR/TREASURER/OFFICER) | `market` | `MarketDashboard` | role DB |
| hash `superadmin/market-edit/<id>` | `market-edit` | `MarketEditPage` | `ADMIN` |
| hash `superadmin*` | `superadmin` | `SuperAdminDashboardImproved` | `ADMIN` |

- Navigasi antar-halaman dashboard memakai hash + state internal.
- `ProtectedRoute` (client-side) membandingkan `role_name` persis; kontrol akses sebenarnya tetap RLS.

## Web — lapisan lib

| Berkas | Peran |
|---|---|
| `lib/supabase.ts` | Inisialisasi klien anon; deteksi placeholder; nama bucket storage |
| `lib/api.ts` | Kelas `ApiClient` — query Supabase bertipe (markets, officers, stalls, transactions) |
| `lib/roleUtils.ts` | `getUserRole`, `getUserRoles`, `hasRole`, `getUserMarket`, impersonation localStorage |
| `lib/store.ts` | State global zustand |
| `lib/exportUtils.ts` | Export XLSX/CSV + Google Sheets |
| `lib/imageUtils.ts` | Kompresi/konversi gambar upload |
| `lib/retributionMasterData.ts` | Master data tarif |

## Role resolution {#role-resolution}

```
getUserRole(userId)
  ├─ user_roles (join roles.name, markets.name) LIMIT 1   → dipakai bila ada
  └─ fallback: users.auth_uid = userId → id_role → roles.name
```

Konsekuensi: dua sumber kebenaran peran. Bila `user_roles` dan `users.id_role` berbeda,
UI mengikuti `user_roles`; beberapa query lain memakai `users.id_role`. Perubahan peran
wajib memperbarui keduanya.

## Role model & mode baca-saja (2026-10-25)

- **Impersonation dihapus total**: state, props `Dashboard`/`MarketDashboard`, helper `roleUtils`,
  dan key `impersonate_*` di localStorage (dibersihkan saat app start).
- **ADMIN** adalah satu-satunya pengelola pasar (master & operasional).
- **MARKET_HEAD read-only**: tetap bisa login & membaca data pasar, tetapi semua penulisan
  (market, sector, config, announcement, tarif, lapak, owner, transaksi, user) ditolak RLS.
  UI menampilkan banner "Mode baca-saja".
- **Pengecualian yang dipertahankan**:
  - `OFFICER`: INSERT transaksi & absensi miliknya, INSERT setoran miliknya.
  - `TREASURER`: UPDATE setoran (approval tahap 1) pada pasar terkait.
  - Semua user: UPDATE profil sendiri (kolom aman; trigger `guard_users_privileged_columns`).
- Approval setoran tahap 2 (sebelumnya kepala pasar) kini menjadi kewenangan ADMIN.

## Express (`src/server.ts`)

```
helmet → rateLimit(100/15m) → cors(origin allowlist, tanpa Origin ditolak)
→ json(10mb) → GET /api/health (sebelum cors untuk monitoring)
→ /api/{markets,officers,stalls,transactions}: authenticateToken
→ /api/users: authenticateToken + requireAdmin
→ error handler (500) → 404 JSON
```

`authenticateToken` memanggil `supabaseAdmin.auth.getUser(token)` lalu menempelkan `req.user`.
`checkRole` membaca `user_roles` dan mencocokkan nama role (uppercase).

Catatan: `cors` melempar `Error` untuk origin tak dikenal → jatuh ke error handler → **500**, bukan 403.

## Vercel functions (`api/`)

| Fungsi | Method | Otorisasi | Client |
|---|---|---|---|
| `users.ts` | GET/POST/DELETE | **tidak ada** | service role |
| `lapak.ts` | POST | PIN 4 digit (`PUBLIC_STALL_PIN`/`_HASH`, default `1234`) | service role |
| `perumda.ts` | POST login PIN 6 digit → JWT 1 jam; GET agregat | JWT (`PERUMDA_JWT_SECRET`) | service role |

Semua mengirim header `Access-Control-Allow-Origin: *`.

## Mobile (`mobile/lib`)

- `main.dart` — muat `.env` (flutter_dotenv), init Supabase, `ProviderScope`.
- `config/router.dart` — `go_router` + `RouterNotifier` (refresh saat auth berubah) + redirect
  route terproteksi ke `/login`.
- `features/*` — halaman: splash, landing, login, dashboard, scan, transaction, lapak, payment,
  receipt, shop, summary, attendance, history, reconciliation, setoran.
- `services/` — `supabase_service`, `auth_service`, `stall_repository`, `local/database_service`
  (sqflite), `sync_service` (sinkronisasi offline), `attendance_service`.
- Transaksi menyimpan `amount` (bukan `total_amount`); validasi pasar dijaga trigger DB
  `trg_validate_transaction_market` (klaim TODO_FIXES; status DB `UNKNOWN`).
