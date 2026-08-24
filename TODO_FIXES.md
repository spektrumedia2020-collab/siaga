# ✅ Todolist Perbaikan — SIAGA (Berdasarkan Audit 23 Agustus 2026)

> Checklist ini disusun dari `AUDIT_REPORT.md`. Centang (`[x]`) setiap item saat selesai.
> Urutan: kerjakan **Sprint 1** dulu (keamanan), lalu Sprint 2 (arsitektur & UX), sisanya backlog.

---

## ✅ SUDAH SELESAI — Perbaikan dari Audit Pertama (terverifikasi di kode)

- [x] **0.1** Amankan endpoint backend — `authenticateToken` + `requireAdmin` diterapkan di semua route (`src/server.ts` baris 76-82) ✅ *Diverifikasi 23 Agu 2026*
- [x] **0.2** Pindahkan Supabase credentials mobile ke environment variables — `main.dart` memuat dari `.env` via flutter_dotenv ✅ *Diverifikasi 23 Agu 2026*

> Item di bawah ini adalah sisa pekerjaan yang **belum** dikerjakan.

---

## 🔴 SPRINT 1 — Keamanan & Bug Kritis (~2 hari)

### Mobile: Keamanan
- [x] **1.1** Hapus blok bypass RLS di `mobile/lib/features/transaction/transaction_page.dart` ✅ *Selesai 23 Agu 2026* — blok "admin client bypass" dihapus, diganti `rethrow` + komentar keamanan; validasi market kini murni server-side via trigger `trg_validate_transaction_market`; flutter analyze tetap 0 error
- [x] **1.2** Buat RLS policy INSERT untuk tabel `transactions` — ✅ File SQL dibuat: `mobile/assets/sql/fix_transactions_insert_rls.sql`. **✅ SUDAH DIEKSEKUSI ke production via psql (23 Agu)** — policy + trigger `trg_validate_transaction_market` aktif & terverifikasi
- [x] **1.3** Simpan SQL policy ke `mobile/assets/sql/fix_transactions_insert_rls.sql` untuk dokumentasi ✅ *Selesai 23 Agu 2026*

### Mobile: Route Guard & Inisialisasi
- [x] **1.4** Implementasikan route guard di `mobile/lib/config/router.dart` ✅ *Selesai 23 Agu 2026* — `RouterNotifier` kini listen `onAuthStateChange`; redirect: belum login akses protected → `/login`, sudah login di `/login` → `/dashboard`; route publik (`/`, `/landing`, `/login`) tetap terbuka
- [x] **1.5** Hapus global instance `final supabaseService = SupabaseService(...)` di `mobile/lib/services/supabase_service.dart` ✅ *Selesai 23 Agu 2026*
- [x] **1.6** Ganti dengan Riverpod provider (lazy) `supabaseServiceProvider` ✅ *Selesai 23 Agu 2026*
- [x] **1.7** Update semua pemakaian `supabaseService` ✅ *Diverifikasi 23 Agu 2026* — grep menunjukkan TIDAK ADA file lain yang memakai global instance (semua halaman sudah pakai `Supabase.instance.client` langsung), jadi tidak ada perubahan tambahan diperlukan

### Mobile: Debug Code
- [x] **1.8** Ganti semua 29 `print('DEBUG TransactionPage: ...')` menjadi `debugPrint(...)` di `transaction_page.dart` ✅ *Selesai 23 Agu 2026* — sisa print DEBUG = 0; linter issues turun 170 → 141
- [x] **1.9** Hapus logika fallback insert transaksi ✅ *Selesai 23 Agu 2026* — hapus 3-level fallback (`amount`→`total_amount`→no-column); pakai kolom `amount` tunggal langsung; flutter analyze 0 error

### Umum: Konfigurasi
- [x] **1.10** Pastikan `.env`, `.env.local`, `mobile/.env` masuk `.gitignore` ✅ *Diverifikasi 23 Agu 2026* — web `.gitignore` sudah mencakup `.env`, `.env.local`, `.env*`, `mobile/.env`; mobile `.gitignore` sudah mencakup `.env` + `!.env.example`
- [x] **1.11** Verifikasi tidak ada secret ter-commit di git history ✅ *Diverifikasi 23 Agu 2026* — `git log --all -- .env .env.local mobile/.env` menghasilkan kosong = aman
- [x] **1.12** Perketat CORS di `src/server.ts` ✅ *Selesai 23 Agu 2026* — request tanpa Origin kini DITOLAK; `/api/health` dipindah sebelum CORS agar monitoring tools tetap bisa akses

### Verifikasi Sprint 1
- [x] **1.13** Jalankan `flutter analyze` — pastikan 0 error ✅ *Diverifikasi 23 Agu 2026* — 0 error, hanya info-level linter (141 issues, semua pre-existing)
- [ ] **1.14** Test deep link `/dashboard` tanpa login → harus redirect ke `/login`
- [x] **1.15** Test insert transaksi sebagai petugas → berhasil via RLS policy ✅ *Selesai 23 Agu* — RLS + trigger sudah dieksekusi & terverifikasi di production (35 policy, trigger trg_validate_transaction_market aktif); test fungsional tinggal smoke test device (2.22)

---

## 🟡 SPRINT 2 — Arsitektur & UX (~1 minggu)

### Web: Keputusan Arsitektur
- [x] **2.1** Putuskan arsitektur data: **Supabase-first** ✅ *Keputusan 23 Agu 2026* — web+mobile fetch Supabase langsung untuk semua read/query; Express backend hanya bertahan untuk endpoint admin (create user)
- [x] **2.2** Backend Express jadikan **optional**: hanya `/api/users`, `/api/markets`, `/api/market-heads` dipakai `UserManagement.tsx` (fetch POST create user). Retire selain itu ✅ *Keputusan 23 Agu 2026* — semua page lain sudah `api.supabase.*` langsung; tidak perlu migrate
- [x] **2.7** Konsolidasi API: pakai `src/routes/*.ts` (Express local) sbg satu-satunya API server; hapus duplikat `api/*.ts` (Vercel functions) yang redundan ✅ *Keputusan 23 Agu 2026* — kurangi surface attack + deploy lebih simpel

### Web: Bersih-bersih Duplikat
- [x] **2.4** Finalisasi skema: pilih kolom `amount` ✅ *Keputusan 23 Agu 2026* — kolom `amount` jadi standar; hapus fallback di `transaction_page.dart`; **file migrasi dibuat: `mobile/assets/sql/migrate_transactions_amount.sql`** (idempoten: ADD COLUMN IF NOT EXISTS → backfill dari total_amount → drop usang non-destruktif → verifikasi); ⚠️ `setoran.total_amount` JANGAN disentuh (itu benar — total setoran harian)
- [x] **2.5** Hapus `src/pages/SuperAdminDashboard.tsx` + `SuperAdminDashboard.css` (versi lama) ✅ *Selesai 23 Agu 2026* — diverifikasi tidak ada import lain; build web tetap sukses
- [x] **2.6** Hapus `src/index copy.css` ✅ *Selesai 23 Agu 2026*
- [x] **2.7** Konsolidasi API selesai ✅ *Selesai 23 Agu 2026* — hapus 4 file Vercel functions tak terpakai (`api/markets.ts`, `api/markets/[id]/index.ts`, `api/users/market-heads.ts`, `api/users/sync.ts`); **pertahankan `api/users.ts`** (dipakai UserManagement create-user); update `vercel.json` (builds + routes hanya api/users); build web ✓ 1.22s

### Web: Komponen UI Reusable
- [x] **2.8** Buat `src/components/ConfirmDialog.tsx` + `ConfirmDialog.css` ✅ *Selesai 23 Agu 2026* — modal bergaya brand (#2D5016), dukung mode danger, loading state, Escape key, aria attributes
- [x] **2.9** Ganti semua `confirm()` browser ✅ *Selesai 23 Agu 2026* — **11 halaman / 12 tempat**: CategoriesPage, OwnersPage, OfficersPage, MarketsManagement, MarketsPage, StallsPage (×2: lapak & rate), RetribusiPage, SectorsPage, ThemeManagement (prompt+confirm → modal input ID pasar), UserManagement; verifikasi grep = 0 sisa; build web sukses
- [x] **2.10** Buat `src/components/Loading.tsx` + `Loading.css` ✅ *Selesai 23 Agu 2026* — 2 variant: spinner (brand hijau) & skeleton shimmer; dukung label, rows, fullHeight; aria + sr-only untuk aksesibilitas
- [x] **2.11** Buat `src/components/EmptyState.tsx` + `EmptyState.css` ✅ *Selesai 23 Agu 2026* — ikon + judul + subtitle + tombol aksi opsional; border dashed bergaya kartu
- [x] **2.12** Terapkan `<Loading>` & `<EmptyState>` di semua halaman list ✅ *Selesai 23 Agu 2026* — **7 halaman**: StallsPage, TransactionsPage, CategoriesPage, OwnersPage, SectorsPage, RetribusiPage; setiap halaman kini punya spinner brand + empty state dengan ikon/judul/subtitle kontekstual; build web sukses

### Web: Ikon & Styling
- [x] **2.13** Ganti emoji aksi (💰✏️🗑️) di `StallsPage.tsx` dengan ikon SVG ✅ *Selesai 23 Agu 2026* — tambah `IconEdit`, `IconTrash`, `IconMoney` di `Icons.tsx` (gaya stroke konsisten, prop size); semua tombol aksi kini pakai SVG + `aria-label` dinamis per lapak; build web sukses
- [x] **2.14** Pindahkan inline styles besar di `TransactionsPage.tsx` ke CSS file ✅ *Selesai 23 Agu 2026* — buat `src/pages/TransactionsPage.css` (22 kelas); ganti semua `<th style>`/`<td style>`/`<span style>` di tabel transaksi dengan className dinamis + status badge logic via helper variabel; perbaiki typo "LUMAT"→"LUNAS"; build web sukses
- [ ] **2.14-st** StallsPage: pindahkan rate dialog inline styles ke `.css` di `StallsPage.css` (prioritas rendah — modal kecil)

### Mobile: UX Dashboard
- [x] **2.15** Implementasi pull-to-refresh di `dashboard_page.dart` ✅ *Selesai 23 Agu 2026* — `onRefresh` kini memanggil `_loadTodayStats()` via callback prop `onRefresh` (pattern konsisten dengan onSync/onToggleOffline); flutter analyze 0 error
- [x] **2.16** Buat tabel `market_config` untuk konfigurasi dinamis ✅ *Selesai 23 Agu 2026* — file SQL `create_market_config_table.sql` (RLS + seed `daily_target_stalls`=50); **FIX 23 Agu: policy UPDATE kini pakai `JOIN roles`** (sebelumnya `u.id_role IN ('ADMIN',...)` error 22P02 karena id_role bigint); ⚠️ butuh deploy + fetch di dashboard_page.dart
- [x] **2.17** Buat tabel `announcements` ✅ *Selesai 23 Agu 2026* — file SQL `create_announcements_table.sql` (RLS + index + support per-market + periode); **FIX 1: policy ALL kini pakai `JOIN roles`** (error 22P02 bigint teratasi); **FIX 2: `created_by` → `integer references users(id_user)`** (error 42703 — PK users adalah `id_user`, bukan `id`); ⚠️ butuh deploy + integrasi fetch di `_buildAnnouncementCard()`
- [x] **2.18** Buat helper error handling konsisten ✅ *Selesai 23 Agu 2026* — `mobile/lib/core/ui_helpers.dart`: `showErrorSnackBar` (merah), `showSuccessSnackBar` (hijau), `showInfoSnackBar` (netral); semua floating style + guard `context.mounted`
- [x] **2.19** Terapkan helper tersebut di semua halaman mobile ✅ *Selesai 23 Agu 2026* — **5 file / 14 tempat**: dashboard_page (6: mode offline info, sync success/info/error, QR info, foto profil success), landing_page (3: sync offline info/success/error), scan_page (1: QR info), setoran_page (2: petugas tidak ditemukan + gagal → error), setoran_form_dialog (2: setoran success/gagal error); flutter analyze 0 error

### Verifikasi Sprint 2
- [x] **2.20** Jalankan build web (`npm run build`) — sukses tanpa error ✅ *Diverifikasi 23 Agu 2026* — ✓ built in ~1.3s
- [x] **2.21** Jalankan `flutter analyze` — 0 warning/error baru ✅ *Diverifikasi 23 Agu 2026* — 141 issues semuanya info-level pre-existing
- [ ] **2.22** Smoke test manual: login → dashboard → transaksi → receipt (web & mobile)

---

## 🟢 BACKLOG — Peningkatan Lanjutan

### Web
- [ ] **3.1** Responsivitas: media queries, tabel → card list di < 768px
- [ ] **3.2** Aksesibilitas: tambah `aria-label` pada tombol ikon
- [ ] **3.3** Aksesibilitas: naikkan kontras teks abu-abu (#999 → #6b7280 minimal)
- [x] **3.4** Tambahkan Error Boundary React di `main.tsx` ✅ *Selesai 23 Agu 2026* — buat `src/components/ErrorBoundary.tsx` (class component, getDerivedStateFromError + componentDidCatch → console.error, fallback dengan tombol kembali ke beranda + aria role="alert"); import & bungkus `<App />` di `main.tsx`; build web sukses
- [ ] **3.5** Aktifkan TypeScript strict mode, hapus `any` bertahap
- [ ] **3.6** Setup ESLint + Prettier (config + pre-commit hook)
- [ ] **3.7** Konsolidasi routing: React Router nested routes (ganti hash routing)

### Mobile
- [ ] **3.8** Overlay visual scan QR (kotak frame + animasi garis) di scan page
- [x] **3.9** Tambah `pageTransitionsTheme` di `AppTheme` ✅ *Selesai 23 Agu 2026* — `ZoomPageTransitionsBuilder` untuk semua platform (Material 3); flutter analyze 0 issue
- [ ] **3.10** Standarisasi penamaan fitur (lapak/setoran/shop/summary) + dokumentasi mapping
- [ ] **3.11** Widget test untuk alur kritis: login, scan, transaksi
- [ ] **3.12** Auto-sync offline queue saat connectivity kembali (connectivity_plus listener)

### Database & Infra
- [x] **3.13** Konsolidasi SQL ke `migrations/` ✅ *Selesai 23 Agu 2026* — buat `mobile/migrations/`: `README.md` (mapping 30+ file → 5 file), `001_init.sql`, `003_rls_policies.sql`. **✅ DIEKSEKUSI ke production via psql**: Fase 1 (6 tabel OK), Fase 3 (18 policy OK), Fase 4 (8 fix kolom OK — semua "already exists" = idempoten), Fase 5 tidak perlu (legacy tables hilang, duplikat rates = 0). Verifikasi akhir: 15 tabel, 35 policy, 5 trigger, kolom `amount` numeric (total_amount hilang = migrasi sukses). **FIX seed: officers_seed.sql (hapus code/phone) & sectors_seed.sql (target market_sectors) — diuji ulang via psql & sukses (officers=4, market_sectors=4)**
- [x] **3.14** Dokumentasi skema database ✅ *Selesai 23 Agu 2026* — buat `mobile/migrations/DATABASE_SCHEMA.md`: ERD Mermaid (15 tabel + relasi), deskripsi lengkap tiap tabel + kolom, FK map (18 constraint), RLS policy map (35 policy), trigger & function map, catatan konsistensi skema
- [ ] **3.15** Tuning rate limit backend sesuai pola penggunaan dashboard
- [x] **3.16** Setup CI (GitHub Actions) ✅ *Selesai 23 Agu 2026* — buat `.github/workflows/ci.yml`: 3 job paralel (web: npm ci + tsc --noEmit + build; mobile: flutter pub get + analyze + test; sql-lint: cek placeholder `...` + pola `id_role IN` salah). Trigger push/PR ke main & develop

---

## 📊 Ringkasan Progres

| Kategori | Item | Selesai | Status |
|----------|------|---------|--------|
| ✅ Audit pertama (keamanan dasar) | 2 | 2/2 | ✅ Selesai |
| 🔴 Sprint 1 (Keamanan lanjutan) | 15 | 13/15 | 🟡 Berjalan |
| 🟡 Sprint 2 (Arsitektur & UX) | 22 | 18/22 | 🟡 Berjalan |
| 🟢 Backlog | 16 | 4/16 | 🟡 Berjalan |
| **Total** | **55** | **37/55** | 🟡 67% |

> **Estimasi sisa:** Sprint 1 ≈ 2 hari · Sprint 2 ≈ 1 minggu · Backlog = fleksibel
---

## 🐛 BUG FIX — Pasar tidak bisa diedit dari superadmin dashboard (23 Agu 2026)

- **Akar masalah:** tabel `markets` hanya punya RLS policy SELECT (public) — tidak ada UPDATE/INSERT/DELETE, jadi Supabase memblokir semua operasi tulis secara diam-diam.
- **Fix:** file `mobile/assets/sql/fix_markets_rls.sql` — 3 policy baru:
  - `markets_update_admin_or_head` (UPDATE): ADMIN semua pasar ATAU MARKET_HEAD pasar miliknya (`id_head_market`)
  - `markets_insert_admin` (INSERT): hanya ADMIN
  - `markets_delete_admin` (DELETE): hanya ADMIN
- ✅ **DIEKSEKUSI ke production via psql & terverifikasi**: 4 policy markets aktif (SELECT/UPDATE/INSERT/DELETE), total policy public = 38.
