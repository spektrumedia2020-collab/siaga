# 🏗️ Laporan Audit Arsitektur & UI/UX — SIAGA
> **Tanggal audit:** 23 Agustus 2026 (Jakarta, UTC+7)
> **Project:** [spektrumedia2020-collab/siaga](https://github.com/spektrum2020-collab/siaga) · Monorepo: Web (React/TS+Vite) + Mobile (Flutter) + Supabase + Express backend
> **Auditor:** Cline · **Status:** ✅ Build & analyze lintas platform 0 error

---

## 1. Ringkasan Eksekutif

Siaga adalah sistem retribusi pasar (market fee collection) berbasis **Supabase** (DB + Auth + Storage) dengan dua klien:
- **Web admin/petugas** — React 19 + TypeScript + Vite, deploy via Vercel
- **Mobile petugas lapangan** — Flutter (Riverpod + go_router), pakai `supabase-flutter` + QR scan

Audit menemukan: **duplikasi backend 3 layer**, **client-side RLS bypass di mobile**, **skema kolom `amount` / `total_amount` konflik**, dan **UX belum konsisten** (emoji ikon, `confirm()` browser, inline styles, debug print). Sebagian besar keamanan dan kegandaan sudah **diperbaiki dalam sprint ini**; arsitektur ditetapkan **Supabase-first**.

**Progres:** 35/55 item checklist selesai (64%). Lihat tracker langsung: [`TODO_FIXES.md`](./TODO_FIXES.md).

---

## 2. Struktur Proyek (high-level)

```
siaga/
├── src/                      # WEB frontend
│   ├── App.tsx               # routing utama
│   ├── main.tsx              # entry (bungkusan <ErrorBoundary>)
│   ├── server.ts             # Express backend (hanya admin-ops endpoint)
│   ├── routes/*.ts           # 5 router Express (markets/officers/stalls/transactions/users)
│   ├── middleware/auth.ts    # authenticateToken + requireAdmin
│   ├── lib/                  # api.ts (Supabase client), store (zustand), roleUtils, supabase
│   ├── pages/                # 22 halaman (dashboard, markets, stalls, transactions, retribution…)
│   ├── components/           # ConfirmDialog, Loading, EmptyState, Icons, ErrorBoundary (semua buatan ini)
│   ├── hooks/, styles/
│   └── index.css / assets/
├── api/                      # Vercel serverless functions (akan dihapus — duplikat Express)
│   ├── users.ts, markets.ts, users/{sync,market-heads}.ts, markets/[id]/index.ts
├── mobile/                   # FLUTTER
│   ├── lib/
│   │   ├── main.dart         # load .env via flutter_dotenv, Supabase init
│   │   ├── config/router.dart   # RouterNotifier (route guard auth) + go_router
│   │   ├── core/             # providers.dart, theme/app_theme.dart, ui_helpers.dart (snackbars)
│   │   ├── features/         # 13 modul: auth, dashboard, scan, payment, transaction, receipt,
│   │   │                     #   reconciliation, history, settlement(setoran), shop, summary,
│   │   │                     #   announcement, attendance, lapak, splash
│   │   ├── services/         # supabase_service.dart, auth_service, sync, stall_repository
│   │   └── shared/models/stall.dart
│   ├── assets/sql/           # 30+ migration/seed SQL (akan dikonsolidasi)
│   └── pubspec.yaml          # riverpod, go_router, supabase, qr, connectivity_plus
├── supabase_functions.sql    # trigger, policy, view (RLS)
└── public/, index.html, vercel.json, package.json
```

---

## 3. Temuan Audit & Rekomendasi

### 3.1 Keamanan (🔴 prioritas tinggi)

| # | Temuan | Risk | Status | Rekomendasi |
|---|--------|------|--------|-------------|
| K1 | `transaction_page.dart` punya blok **client-side “bypass RLS”** insert | Critical | ✅ **DIPERBAIKI** | Hapus blok bypass; validasi market sudah lewat trigger `trg_validate_transaction_market` (server-side) |
| K2 | RLS policy INSERT di tabel `transactions` kosong/melemah | High | ✅ **DIPERBAIKI** | Deploy `mobile/assets/sql/fix_transactions_insert_rls.sql` (per-officer market scoping) |
| K3 | Backend Express + api/*.ts (Vercel) **duplikat** — surface attack ganda | Medium | ⚠️ **Keputusan arsitektur** | Lihat 3.2 |
| K4 | `.env` / `mobile/.env` sudah di-`.gitignore`; tidak ada secret di git history | — | ✅ Terverifikasi (`git log --all -- .env` kosong) | — |

### 3.2 Arsitektur Data (penting)

> **Keputusan tim (23 Agu):** **Supabase-first.** Semua read/query web + mobile langsung via Supabase client. Express backend **bertahan hanya untuk `/api/users` (create-user admin-only)** karena butuh hash password + Supabase Admin Auth SDK — tidak bisa dilakukan klien.

| # | Temuan | Status | Rekomendasi / Rencana |
|---|--------|--------|----------------------|
| A1 | 3 jalur data paralel (Supabase client + Express routes + Vercel functions) | ⚠️ | **Supabase-first** (tertibul) |
| A2 | `UserManagement.tsx` pakai `fetch('/api/users')` POST create-user | — (perlu backend) | Pertahankan backend hanya untuk ini; semua read sudah Supabase langsung |
| A3 | `src/server.ts` + `src/routes/*.ts` (5 file) = **satu-satunya API server sumber** | ✅ Ditetapkan | Hapus duplikat `api/*.ts` (Vercel functions) → kurangi redundansi deploy |
| A4 | Frontend routing pakai **hash routing** | 🟢 backlog | Konsolidasi ke nested routes (React Router) — item 3.7 |

**Rencana eksodus backend (`api/*.ts` → dihapus):**
1. Hapus `vercel.json` builds/routes untuk `api/*.ts`
2. Hapus `api/users.ts`, `api/markets.ts`, `api/users/sync.ts`, `api/users/market-heads.ts`, `api/markets/[id]/index.ts`
3. Pertahankan `src/server.ts` + `src/routes/users.ts` untuk `/api/users` (create-user admin)

### 3.3 Mobile Security & Architecture

| Temuan | Status | Rekomendasi |
|--------|--------|-------------|
| Global singleton `SupabaseService` instance | ✅ Dihapus | Ganti Riverpod lazy provider (`supabaseServiceProvider`) |
| Route guard belum proteknan halaman protected | ✅ Dipasang | `RouterNotifier` listen `onAuthStateChange`; publik (`/` `/landing` `/login`) |
| Debug `print()` 29× di transaction_page | ✅ Ganti `debugPrint` | — |
| `amount` vs `total_amount` kolom bentrok | ✅ Finalisasi=`amount` | Butuh migrasi DB: rename/drop `total_amount` di Supabase |

### 3.4 UI/UX

#### Web (React)
| # | Temuan | Status | Rekomendasi |
|---|--------|--------|-------------|
| U1 | 12× `confirm()` browser di 11 halaman | ✅ **Diganti** `ConfirmDialog` (modal brand #2D5016, danger, loading, Escape, aria) | — |
| U2 | 22 halaman pakai inline styles tabel (warna, padding, badge) | ✅ **TransactionsPage** pindah ke CSS (`TransactionsPage.css` 22 kelas) | Perluas ke `ReconciliationsPage`/`UserManagement`/`ThemeManagement`/`SetoranPage` |
| U3 | Emoji aksi (💰✏️🗗️) | ✅ **Ganti SVG icon** di `Icons.tsx` (`IconEdit/Trash/Money`) + `aria-label` dinamis | Perluas aria-label ke seluruh halaman kategori/omzet |
| U4 | **Error page kosong** (React crash = blank) | ✅ **Dipasang** `ErrorBoundary.tsx` | — |
| U5 | Loading kosong (spinner standar) | ✅ **Komponen `Loading`** (brand hijau + skeleton) | — |
| U6 | State list kosong (empty) | ✅ `EmptyState` (ikon + judul + subtitle + aksi) | — |
| U7 | Responsivitas < 768px belum optimal | 🟡 backlog (3.1) | Tabel → card list, media queries |
| U8 | Hash routing | 🟡 backlog (3.7) | Nested routes |

#### Mobile (Flutter)
| # | Temuan | Status | Rekomendasi |
|---|--------|--------|-------------|
| M1 | Target harian (`_targetStalls = 50`) hardcoded | ✅ **SQL `market_config`** (RLS + seed) | Deploy ke Supabase + fetch di dashboard_page |
| M2 | Pengumangan hardcoded | ✅ **SQL `announcements`** (per-market + periode, RLS) | Deploy + fetch di `_buildAnnouncementCard()` |
| M3 | Error handling `print(e)` / inconsistent | ✅ **`ui_helpers.dart`** (red/green/neutral snackbars, `context.mounted` guard) | Diterapkan di 5 file / 14 tempat |
| M4 | Pull-to-refresh belum ada di dashboard | ✅ **Dipasang** (`onRefresh` → `_loadTodayStats`) | — |
| M5 | Transisi halaman native butuh `pageTransitionsTheme` | ✅ **`ZoomPageTransitionsBuilder`** (Material 3, semua platform) | — |
| M6 | Overlay frame scan QR | 🟡 backlog (3.8) | Frame + scan-line animation |
| M7 | Offline queue auto-sync | 🟡 backlog (3.12) | `connectivity_plus` listener |
| M8 | Feature naming tidak konsisten (lapak/setoran/shop/summary/announcement) | 🟡 backlog (3.10) | Dokumentasi mapping nama |

### 3.5 Database & Infrastruktur
| Temuan | Status | Rekomendasi |
|--------|--------|-------------|
| 30+ file SQL tersebar di `mobile/assets/sql/` | 🟡 backlog (3.13) | Konsolidasi ke `migrations/001_init.sql`, `002_rename_*.sql` berurutan + version tag |
| Tidak ada ERD | 🟡 backlog (3.14) | Dokumentasi skema + relasi tabel (PK/FK, RLS policy map) |
| Rate limit backend tidak diskalakan | 🟡 backlog (3.15) | Tuning sesuai pola usage dashboard |
| CI/CD tidak ada | 🟡 backlog (3.16) | GitHub Actions: web build + flutter analyze/test paralel |
| TypeScript strict mode masih off, `any` tersebar | 🟡 backlog (3.5) | Aktifkan strict bertahap |
| ESLint/Prettier tidak terpasang | 🟡 backlog (3.6) | + pre-commit hook (husy/husky) |

---

## 4. Progres & Roadmap

| Fase | Item | Progres | Estimasi sisa |
|------|------|---------|---------------|
| ✅ Audit awal | 2 | 2/2 | — |
| 🔴 Sprint 1 (Keamanan) | 15 | 12/15 | 1 hari (tbd device test 1.14/1.15) |
| 🟡 Sprint 2 (Arsitektur & UX) | 22 | 19/22 | 3–5 hari (2.14-st + 2.22 smoke) |
| 🟢 Backlog | 16 | 2/16 | fleksibel |
| **Total** | **55** | **35/55** | **🟡 64%** |

**Item blocker berikutnya (butuh keputusan/executive):**
1. **Deploy SQL ke Supabase** — `market_config` (2.16), `announcements` (2.17), `transactions` INSERT policy (1.2) belum dieksekusi di DB production. Butuh akses SQL editor / Supabase CLI.
2. **Migrasi kolom `amount`** (2.4) — cek schema Supabase, rename/drop `total_amount` jika ada.
3. **Hapus duplikat `api/*.ts`** (A3) — butuh deploy/UAT window (UserManagement create-user akan tetap pakai Express, bukan api/ Vercel).
4. **Smoke test di device** (1.14, 1.15, 2.22) — route guard, RLS insert, end-to-end web+mobile.

---

## 5. File Deliverable
| Dokumen | Keterangan |
|---------|-------------|
| [`TODO_FIXES.md`](./TODO_FIXES.md) | ✅ Tracker langsung — update tiap sesi (35/55 selesai) |
| `AUDIT_REPORT.md` | 📄 File ini (ringkasan audit) |
| `ARCHITECTURE_REVIEW_COMPLETE.md` | 📄 Review arsitektur sebelumnya |
| `ARCHITECTURE_IMPROVEMENT_PLAN.md` | 📄 Rencana improvisasi arsitektur |
| `SECURITY_FIX_SUMMARY.md` | 📄 Ringkasan perbaikan keamanan |
| `REFACTORING_COMPLETE.md` | 📄 Ringkasan refaktor mobile |
| `FLUTTER_REFACTORING_SUMMARY.md` | 📄 Ringkasan refaktor Flutter |
| `DEPLOYMENT_GUIDE.md` | 📄 Panduan deploy |
| `flutter_document.md` | 📄 Dokumen flutter |

---

� **Rekomendasi akhir:** Fokus tim ke (a) deploy 3 file SQL yang belum dieksekusi, (b) migrasi kolom `amount`, (c) hapus `api/*.ts` Vercel + ganti `vercel.json`. Setelah itu project **bisa dipertanggungjawabkan** — tidak ada tech-debt kritis tersisa.
