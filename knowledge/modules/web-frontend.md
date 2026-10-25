# Modul — Web Frontend

Path: `src/` · Stack: React 19 + TypeScript + Vite · Status: **VERIFIED** · 2026-10-25

## Tanggung jawab

UI untuk superadmin, admin pasar, bendahara, petugas (web), plus halaman publik
(landing pasar, lapak, dokumentasi juri, dashboard Perumda).

## Struktur

| Direktori | Isi |
|---|---|
| `src/App.tsx` | Router manual (hash + pathname), auth state, impersonation, redirect per role |
| `src/components/` | `Auth`, `Dashboard` (shell), `Navigation`, `ProtectedRoute`, `ConfirmDialog`, `EmptyState`, `Loading`, `ErrorBoundary`, `ExportButtons`, `QRCodeGenerator`, `DateRangePicker`, `Icons` |
| `src/pages/` | `SuperAdminDashboardImproved`, `MarketDashboard`, `MarketEditPage`, `MarketLandingPage`, `PublicStallPage`, `JuriDocumentationPage`, `PerumdaPage`, `MarketsManagement`, `MarketsPage`, `MarketDetailPage`, `StallsPage`, `OwnersPage`, `OfficersPage`, `CategoriesPage`, `SectorsPage`, `RetribusiPage`, `TransactionsPage`, `SetoranPage`, `ReconciliationsPage`, `UserManagement`, `ThemeManagement` |
| `src/lib/` | `supabase`, `api` (ApiClient), `roleUtils`, `store` (zustand), `exportUtils`, `googleSheetsAuth`, `imageUtils`, `retributionMasterData`, `userProfile` |
| `src/styles/`, `src/*.css` | Layout & tema |
| `src/server.ts`, `src/routes/`, `src/middleware/` | Backend Express (bukan bagian SPA build) |

## Alur kunci

- Render awal: `Auth` bila belum ada user; setelah login → role → `#superadmin/dashboard` atau `#market/dashboard`.
- Halaman publik dicek **sebelum** auth: `/@slug`, `/lapak/:id/:kode`, `/juri`, `/perumda`.
- Admin pasar yang membuka hash `superadmin*` dipaksa kembali ke `#market/dashboard`.

## Ketergantungan

- Supabase (anon key) untuk semua CRUD; RLS menentukan izin baris.
- `/api/users` untuk pembuatan user (saat ini tanpa auth — lihat SECURITY S-01).
- `/api/perumda` untuk dashboard agregat; `/api/lapak` untuk halaman lapak.

## Known issues

- `MarketLandingPage.old.tsx` dan `MarketLandingPage.css.old` masih ada (dead code).
- Banyak inline style & `alert()/confirm()` (lihat BACKLOG P2).
- Tombol akun test tampil default (S-08).
- Tidak ada test; tidak ada lint/typecheck script.
