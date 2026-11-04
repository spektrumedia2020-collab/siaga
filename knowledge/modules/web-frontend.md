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
| `src/pages/` | `SuperAdminDashboardImproved`, `MarketDashboard`, `MarketEditPage`, `MarketLandingPage`, `PublicStallPage`, `MarketsManagement`, `MarketsPage`, `MarketDetailPage`, `StallsPage`, `OwnersPage`, `OfficersPage`, `CategoriesPage`, `SectorsPage`, `RetribusiPage`, `MarketBillsPage`, `MarketReportsPage`, `TransactionsPage`, `SetoranPage`, `ReconciliationsPage`, `UserManagement`, `ThemeManagement`, `ImportDataPage` |
| `src/lib/` | `supabase`, `api` (ApiClient), `roleUtils`, `store` (zustand), `exportUtils`, `googleSheetsAuth`, `imageUtils`, `userProfile`, `csvImport`, `csvImportRunner` |
| `src/styles/`, `src/*.css` | Layout & tema |
| `src/server.ts`, `src/routes/`, `src/middleware/` | Backend Express (bukan bagian SPA build) |

## Alur kunci

- Render awal: `Auth` bila belum ada user; setelah login → role → `#superadmin/dashboard` atau `#market/dashboard`.
- Halaman publik dicek **sebelum** auth: `/@slug`, `/lapak/:id/:kode`, `/juri`, `/perumda`.
- Admin pasar yang membuka hash `superadmin*` dipaksa kembali ke `#market/dashboard`.

## Tagihan tahunan (2026-10-31)

- `MarketBillsPage` di `#market/dashboard/bills` (sidebar Keuangan → "Tagihan Tahunan").
- Memuat `retribution_bill_balances` + lapak + pemilik, menampilkan tagihan tahun terpilih, tunggakan
  tahun lama, serta total sisa per lapak; filter tahun/jenis/status + pencarian.
- Tombol "Terbitkan Tagihan" memanggil RPC `generate_retribution_bills` (tarif per lapak).
- Dialog "Bayar" memanggil RPC `pay_retribution_bills` (nominal bebas = cicilan, alokasi FIFO).
- `RetribusiPage` kini menyimpan `billing_period` + `allow_installment` agar jenis baru bisa ditandai
  tahunan/dicicil (sebelumnya selalu HARIAN karena default kolom).
- `TransactionsPage` menampilkan kolom "Tahun" dari `transactions.period_year` dan menormalkan status
  `paid` sebagai LUNAS.

## Laporan & paginasi data besar (2026-11-04)

- `MarketReportsPage` di `#market/dashboard/reports` (sidebar Keuangan → "Laporan").
- Definisi metrik: **target** = `sum(amount_due)` tagihan yang `due_date`-nya jatuh di bulan terpilih
  (status bukan `DIBATALKAN`); **realisasi** = `sum(transactions.amount)` yang `created_at`-nya di bulan
  itu (batas bulan memakai offset `+08:00`); **tunggakan** = `outstanding` semua tagihan terbuka.
- Tabel umur tunggakan memakai selisih hari `due_date` terhadap hari ini (WITA): belum jatuh tempo,
  1–30, 31–60, 61–90, >90 hari.
- Jenis transaksi ditentukan dari `bill_id` (tagihan) atau `rate_id` (tarif), sehingga pembayaran
  harian dan tagihan periode bisa dipisah per jenis.
- **Plafon PostgREST 1.000 baris**: `StallsPage` kini membaca `stalls` bertahap (lihat `fetchAllRows`
  pola di `MarketBillsPage`/`MarketReportsPage`). Jangan memakai satu query `select` untuk tabel
  yang bisa melebihi 1.000 baris (lapak NGD = 1.396).

## Ketergantungan

- Supabase (anon key) untuk semua CRUD; RLS menentukan izin baris.
- `/api/users` untuk pembuatan user (saat ini tanpa auth — lihat SECURITY S-01).
- `/api/perumda` untuk dashboard agregat; `/api/lapak` untuk halaman lapak (wajib PIN pemilik).

## PIN pemilik & domain publik (2026-10-31)

- `/lapak/<token>` (`PublicStallPage`) menampilkan gate PIN (default `7777`) sebelum memuat data.
  Setelah terbuka ada bagian **PIN Pemilik** untuk mengganti PIN (butuh token di URL).
- Admin dapat mereset PIN dari form **Edit Lapak** (field "PIN Pemilik (4 angka)"); kosong = tidak diubah.
- Tautan publik (QR pemilik/petugas, salin link pasar) memakai `src/lib/publicUrl.ts` →
  `https://siaga.app` di produksi, `localhost` saat dev, dapat dioverride `VITE_PUBLIC_APP_URL`.
- QR pemilik berisi `https://siaga.app/lapak/<token>`; modal QR menampilkan nama pasar di atas QR dan
  menyediakan unduhan PNG 880px + SVG (keduanya memuat nama pasar dan label lapak).
- Kartu ringkasan pemilik: **Total dibayar** (agregat semua transaksi lunas), **Hari ini** (Sudah/Belum
  ditarik + nominal, batas hari Asia/Makassar), **Tunggakan** (total sisa tagihan tahunan), **Terakhir bayar**.
- Bagian **Tagihan Tahunan (Jaspro)**: per tahun → tagihan/dibayar/sisa, badge Lunas/Cicilan/Belum lunas,
  jatuh tempo, dan daftar cicilan; empty-state "Belum ada tagihan tahunan yang diterbitkan."
- Daftar transaksi tetap menampilkan maksimal 50 baris terbaru; label tab menunjukkan "50 dari N" bila total lebih.

## Known issues

- Impersonation sudah **dihapus** (2026-10-25); `MARKET_HEAD` kini read-only dengan banner.
- `MarketLandingPage.old.tsx` dan `MarketLandingPage.css.old` masih ada (dead code).
- Banyak inline style & `alert()/confirm()` (lihat BACKLOG P2).
- Tombol aksi masih tampil untuk kepala pasar meski RLS menolak (butuh fase UI read-only).
- Tombol akun test tampil default (S-08).
- Tidak ada test; tidak ada lint/typecheck script.
