# CURRENT — Task Aktif

**Sesi:** SESSION-2026-10-31-3 · **Update:** 2026-10-31T19:20:00+07:00 · **Branch:** `main` @ `4ac4c1d`

## Status

`WIP` — produksi berisi 1 pasar nyata (NGD, 1396 lapak), 5 petugas, dan 6.412 transaksi simulasi
3 bulan (2026-08-01…2026-10-31, source `SIMULASI`, `officer_id` terisi); dashboard & Analytics
menampilkan data.

## Task

| # | Task | Status | DoD |
|---|---|---|---|
| 1 | Inisialisasi knowledge root (`knowledge/`) | **SELESAI** | Artefak wajib §2.2 ada dengan isi nyata |
| 2 | Sprint 0 — amankan `api/users.ts` | **SELESAI** | Auth ADMIN + CORS; deploy `4a0e766`; produksi 401/403 terverifikasi |
| 3 | Sprint 0 — tinjau policy `user_roles` | **SELESAI** | Migration 007 applied; 4 policy; tanpa `USING (true)` |
| 4 | Sprint 0 — PIN lapak & Perumda secret | **SEBAGIAN** | PIN fail-closed selesai; fitur Perumda dihapus |
| 18 | ~~P0-04 — Perumda secret~~ | **DIHAPUS** | Fitur Perumda dihapus (admin = Perumda) |
| 19 | Full data wipe (DB + storage) | **SELESAI** | Data 0; tersisa 1 admin; master & roles dipertahankan |
| 20 | P1-05 — hijaukan typecheck/CI | **SELESAI** | `tsc --noEmit` 0 error; script `typecheck` ditambah |
| 21 | Hapus halaman juri (`/juri`, `/docs`) | **SELESAI** | Komponen + route dihapus; build/typecheck PASS |
| 22 | Hapus data retribusi & kategori lapak | **SELESAI** | types/rates/categories = 0 |
| 23 | Fase 1 token QR publik lapak | **SELESAI (kode+DB)** | Token + halaman publik + QR pemilik; PIN dihapus |
| 24 | Hapus fallback master retribusi hardcoded | **SELESAI** | `retributionMasterData.ts` dihapus; UI dari DB |
| 25 | Deploy produksi (16 commit) | **SELESAI** | `/api/lapak` 400, `/api/users` 401, `/api/perumda` 404 |
| 26 | P0 UI/UX batch (tema, placeholder, read-only, user delete) | **SELESAI (kode+DB)** | Migration 017; readOnly 9 halaman |
| 27 | P1 routing (deep-link admin, /login, 404) | **SELESAI** | `#superadmin/<tab>`; path-based ditunda |
| 28 | P2 polish (typo, QR, dialog, pagination) | **SELESAI** | Build/typecheck PASS |
| 29 | CI mobile — analyzer + widget test hijau | **SELESAI** | `flutter analyze` 0 issue; `flutter test` PASS; CI `.env` step |
| 30 | Sync knowledge sesi mobile CI | **SELESAI** | log, state, CURRENT, validation diperbarui |
| 31 | Import CSV legacy + UI admin | **SELESAI** | `csvImport`/`csvImportRunner`/`ImportDataPage`; tab `#superadmin/import`; 4 CSV nyata 0 error |
| 32 | Verifikasi import (typecheck/build/runner) | **SELESAI** | `tsc --noEmit` 0 error; `vite build` PASS; impor ulang idempoten (0 create/update) |
| 33 | Commit + push import CSV | **SELESAI** | Push `4b8b87b..20f4ba7`; CI `41148221841` success; bundle produksi memuat UI importer |
| 34 | Template CSV unduhan di dashboard | **SELESAI** | 2 template statis; terparse 0 error; tautan di halaman import; deploy `ba4880c` |
| 35 | Import CSV terpisah: pasar, lapak, tarif | **SELESAI** | `detectImportKind`; `runMarketImport`/`runStallImport`/`runRateImport`; UI per jenis; 3 template baru |
| 36 | Verifikasi split import | **SELESAI** | Simulasi pasar→lapak→tarif: 2 pasar, 5 lapak, 4 jenis, 8 tarif; impor ulang 0 create/update |
| 37 | Build + sinkron knowledge split import | **SELESAI** | `npm run typecheck` 0 error; `npm run build` PASS; `modules/import-csv.md` diperbarui |
| 38 | Deploy split import | **SELESAI** | Push `7fa05b0..19f8647`; CI `41150618429` success; 3 template produksi 200; bundle memuat UI impor baru |
| 39 | Kode lama lapak (migration 018 + UI/QR) | **SELESAI** | Kolom `legacy_code` di prod; kolom/field/QR label; deploy `d180591` |
| 40 | Impor 4 CSV legacy lalu rollback penuh | **SELESAI** | 4098 lapak / 7196 tarif / 3 pasar; typed "HAPUS DATA IMPOR" → semua dihapus satu transaksi |
| 41 | Hapus pasar NGD & pasar contoh MKS | **SELESAI** | Typed "HAPUS NGD" + "contoh pasar hapus juga"; markets=0, stalls=0; snapshot MKS tersimpan |
| 42 | Impor 1 pasar nyata (NGD) lewat UI lokal | **SELESAI** | 1396 lapak, 24 sektor, 740 pemilik, 2 jenis, 2792 tarif; 0 gagal; terverifikasi via pooler |
| 43 | Perbaiki penghitung "pasar baru" di ringkasan impor | **SELESAI** | `summary.marketsCreated` diisi di runner gabungan & lapak; typecheck/build PASS |
| 44 | Overview Superadmin: kolom salah + paginasi | **SELESAI** | `users(id_user, nama)`, `stalls(code, number)`; TOTAL LAPAK 1396; konsol tanpa 400 |
| 45 | Landing pasar: hitungan lapak dari server | **SELESAI** | count exact total & AKTIF; "1396 lapak" tidak lagi terpotong 1000 |
| 46 | Label QR di bawah kode, tanpa kata "Lapak" | **SELESAI** | Format `NGD-0150 \| 1`; PNG unduhan ikut mencetak label |
| 47 | Seed 3 bulan transaksi simulasi (NGD) | **SELESAI** | 6.412 baris, Rp 63.531.000, source `SIMULASI`, status `paid`; Rollback: `delete from transactions where source='SIMULASI'` |
| 48 | Verifikasi Analytics/Overview memuat data seed | **SELESAI** | Overview Rp 63.531.000 / 1396 lapak; Analytics: periode ini Rp 17.961.000 vs sebelumnya Rp 17.070.000 (+5,2%), 3 grafik SVG ter-render |
| 53 | Tema per pasar benar-benar berlaku | **SELESAI** | Pemilih tema di `#superadmin/market-edit/<id>`; `src/lib/marketTheme.ts` memetakan theme_id -> token `--siaga-*`; landing + dashboard ikut tema; uji lokal Biru Laut lalu kembali Navy |
| 54 | Halaman Tema di dashboard pasar (`#market/dashboard`) | **SELESAI** | Tab Operasional "🎨 Tema" (`MarketThemePage`); `theme_id` ditambahkan ke select `getUserMarket`; uji Biru Laut -> reload tetap -> kembali Sunset; commit `4c31822` |
| 55 | 12 color schema tema pasar | **SELESAI (deploy)** | 8 preset baru (Kuning Keemasan, Merah Marun, Teal Tosca, Olive Zaitun, Rose Anggrek, Indigo Malam, Kopi Tanah, Grafit Batu) + 4 lama; 12 baris `market_themes`; 3 halaman tema menampilkan 12; commit `1d1bf71`; CI `41188749207`; produksi 12 tema |
| 56 | Migration 020 — tagihan tahunan + cicilan + tunggakan | **SELESAI (dijalankan pemilik)** | Objek live: `retribution_types.billing_period`/`allow_installment`, tabel `retribution_bills` (UNIQUE lapak+jenis+tahun), `transactions.bill_id`/`period_year`, view saldo, RPC `generate_retribution_bills` + `pay_retribution_bills` (FIFO), trigger penjaga, RLS, seed `NGD-JASPRO` (id 104, tanpa tarif) |
| 57 | Web: halaman Tagihan Tahunan + kolom Tahun | **SELESAI (deploy)** | `MarketBillsPage` di `#market/dashboard/bills` (terbitkan, bayar/cicil FIFO, filter, ringkasan tunggakan); `RetribusiPage` simpan periode + izin cicil; `TransactionsPage` kolom Tahun + normalisasi `paid`→LUNAS; CI `41191095713`; produksi `index.C-AeMmVn.js` |
| 58 | Uji fungsional tagihan (rollback) | **SELESAI** | Transaksi uji diakhiri ROLLBACK, residu 0: generate 2025+2026 idempoten, FIFO 2025 penuh lalu 2026 sebagian, lebih bayar ditolak, pelunasan menutup 2026; semua LUNAS |
| 59 | Cabut EXECUTE `anon` pada RPC tagihan | **SELESAI** | Pemilik menjalankan `migrations/021_revoke_anon_billing_rpcs.sql`. Verifikasi: `has_function_privilege` anon=false untuk kedua RPC, authenticated=true; `routine_privileges` tanpa grant anon/PUBLIC |
| 60 | Seragamkan ikon aksi halaman Lapak | **SELESAI (deploy)** | Warna eksplisit navy/merah + hover tint, emoji diganti SVG (IconQr/IconLink/IconRefresh/IconMoney/IconEdit/IconTrash), spacing dirapatkan; 6 tombol muat tanpa scroll; produksi `index.Dc5QSfuZ.css`; CI `41193919948` |
| 61 | Migration 022 — PIN pemilik lapak | **SELESAI (dijalankan pemilik)** | `stall_access_pins` (RLS tanpa policy), `verify_stall_pin` (service_role), `set_stall_pin` (anon+auth), `admin_set_stall_pin` (auth). Uji rollback: default 7777, ganti PIN, PIN lama salah ditolak, admin reset, anon ditolak; residu 0 |
| 62 | PIN gate halaman publik + ganti PIN + reset admin | **SELESAI (deploy)** | `/api/lapak` 401 tanpa/salah PIN, 200 dengan 7777 di `www.siaga.app`; gate + data tampil; field PIN di Edit Lapak; commit `f2f4449`; CI `41195888495` |
| 63 | Domain publik `siaga.app` untuk QR/link | **SELESAI (deploy)** | `src/lib/publicUrl.ts`; QR pemilik tersalin `https://siaga.app/lapak/<token>`; commit `1e3339f` |
| 64 | Konten halaman pemilik: total dibayar, status hari ini, tagihan Jaspro | **SELESAI (deploy)** | API agregat semua transaksi lunas (bukan 50), `summary` + `bills[]` + cicilan; kartu "Total dibayar / Hari ini (WITA) / Tunggakan / Terakhir bayar"; bagian Tagihan Tahunan dengan empty-state; commit `ab42633`; CI `41196824103` |
| 65 | Banner status hari ini + nama retribusi | **SELESAI (deploy)** | Banner tersendiri di bawah header pasar (kuning BELUM / hijau SUDAH), menyertakan nama retribusi; riwayat transaksi menampilkan nama retribusi; commit `02ccc94`, `c45f7fa`, `68f6e05`; CI `41197512258` |
| 66 | Daftar retribusi ganda + PIN default hilang + Lupa PIN | **SELESAI (deploy)** | `daily_items[]` per jenis HARI di banner (badge LUNAS/BELUM); `pin_status` endpoint + hint 7777 hanya saat default; tombol Lupa PIN dengan instruksi reset; tab "Jenis Retribusi"; commit `c4cf1c7`; CI `41197888919` |
| 67 | Reset PIN via verifikasi nomor HP (gratis) | **SELESAI (deploy)** | Migration 023 `reset_stall_pin_with_phone` (service_role only); form Lupa PIN di halaman publik; rate limit 5/10 menit; uji rollback PASS dengan nomor demo NGD-0150; commit `82f5d16`; CI `41198494812` |
| 68 | Kewajiban isi nomor HP pemilik | **SELESAI (deploy)** | Modal wajib setelah PIN bila `owner_has_phone=false`; aksi `set_phone` (PIN + normalisasi + tolak duplikat); admin tetap bisa isi di halaman Pemilik; tersimpan nyata untuk NGD-0001; commit `3ccac87`; CI `41199073539` |
| 52 | Palet biru muda + navy (header biru muda) | **SELESAI** | Web + mobile; header #e3efff->#bfdbfe teks navy; sisa amber/oranye diganti biru/merah; CI 41180125573, deploy `a543be7` |
| 49 | 5 petugas untuk transaksi simulasi | **SELESAI** | `users` 31–35 role OFFICER di NGD; 6.412 transaksi ber-`officer_id`; Overview TOTAL PETUGAS 5, Top Petugas terisi |
| 50 | Nama pasar di dashboard pasar | **SELESAI** | Blok `.market-identity` di atas sidebar: "Pasar dikelola · Niaga Daya · NGD · Makassar"; ikut Ganti Pasar |
| 51 | Tema navy untuk web + mobile | **SELESAI** | Palet navy `#1e3a8a`/`#152c5b`/`#0b1f3a`; `src/` 0 warna dominan hijau; `AppTheme.primaryNavy`; typecheck/build/analyze/test hijau |
| 14 | P0-03 — env PIN lapak + deploy | **DIGANTI** | PIN dihapus; digantikan token QR per lapak (migration 016) |
| 15 | Role: MARKET_HEAD read-only + hapus impersonation | **SELESAI** | Migration 014; build PASS; deploy `86b62d6` |
| 16 | P0-12 — kredensial admin di halaman publik | **SELESAI (kode)** | Bundle bersih; rotasi password dipilih tidak dilakukan user |
| 17 | Role: hapus TREASURER (DB + auth + UI) | **SELESAI (DB+kode)** | 2 akun & role dihapus; admin ambil alih approval |
| 5 | Verifikasi build/typecheck web | **SELESAI** | `npm run typecheck` 0 error; `npm run build` PASS |
| 6 | Deploy + uji P0-01 di produksi | **SELESAI** | Tanpa token 401, origin asing 403; uji role belum |
| 7 | P0-06 — tutup RLS `retribution_rates` | **SELESAI** | Migration 008 applied; 4 policy terverifikasi |
| 8 | P0-05 — audit RLS produksi | **SELESAI** | 16 tabel / 46 policy; 6 temuan baru (S-11…S-16) |
| 9 | P0-07 — tutup RLS `users` | **SELESAI** | Migration 009 + trigger; uji eskalasi PASS |
| 10 | P0-08 — tutup RLS operasional | **SELESAI** | Migration 010; uji deny+allow PASS |
| 11 | P0-09 — aktifkan RLS `stall_categories` | **SELESAI** | Migration 011; anon ditolak, staf diizinkan |
| 12 | P0-10 — read scope + `setoran` | **SELESAI** | Migration 012; deny/allow PASS |
| 13 | P0-11 — PII `stall_owners` | **SELESAI** | Migration 013; anon hanya `id,name` |

## Scope sesi ini

- Impor CSV tiga jenis berkas: pasar (`contoh-pasar.csv`), lapak (`contoh-lapak.csv`),
  tarif (`contoh-tarif.csv`), dengan deteksi jenis otomatis; format gabungan legacy tetap didukung.
- Runner: `runMarketImport` (upsert pasar), `runStallImport` (pasar + sektor + pemilik + lapak),
  `runRateImport` (pasar/lapak harus ada, jenis dibuat otomatis, tarif di-upsert).
- `legacy_code`: migration 018, parser memilih kolom kode lama yang benar (bukan kolom kosong
  pengganti), kolom tabel + field form + label QR.
- Pembersihan produksi atas instruksi user: rollback seluruh data impor legacy, hapus NGD,
  hapus pasar contoh MKS.
- DDL/delete dijalankan lewat pooler IPv4 karena host DB langsung IPv6-only.
- Tema navy: palet web dikonversi penuh (token + 32 berkas CSS/TSX), aplikasi mobile memakai
  `AppTheme.primaryNavy` (`#1E3A8A`) dengan tint `#E6EDF7`; emas `#ffd700` dan warna semantik
  merah/amber dipertahankan. `market_themes` di DB belum dikonsumsi landing.

## Blocker

- Tidak ada blocker teknis aktif; typecheck/build/simulasi impor lokal hijau.
- Risiko diterima: password `admin@siaga.id` tidak dirotasi (keputusan user, S-18).
- Produksi kini berisi 1 pasar nyata: NGD / Niaga Daya (1396 lapak, 24 sektor, 740 pemilik,
  2 jenis sewa, 2792 tarif) + 5 petugas + 6.412 transaksi simulasi 2026-08-01…2026-10-31.
  SWH/PNK/TRG belum diimpor.
- 5 petugas (Andi Saputra, Rahmat Hidayat, Sitti Aminah, Muhammad Yusuf, Nurul Fadhilah) adalah
  baris `users` role OFFICER **tanpa `auth_uid`** — belum bisa login; hanya untuk data simulasi.
  Tabel `officers` tetap 0 (aplikasi memakai `users` untuk daftar petugas).

## Team Waves

Tidak ada gelombang paralel. `open_wave = null`.

## Next Session Handoff

1. Baca urutan resume: `state.json` → `index/index-state.json` → `context.md` → `memory.md` → `00_INDEX.md` → berkas ini.
2. **Tagihan tahunan (Jaspro) siap dipakai.** Schema live + logika FIFO terbukti lewat uji rollback.
   Langkah pemilik: isi tarif Jaspro per lapak (dialog Tarif di halaman Lapak atau impor
   `contoh-tarif.csv` dengan `KODE-JENIS = NGD-JASPRO`), lalu buka `#market/dashboard/bills`
   → pilih tahun → "Terbitkan Tagihan". Bayar/cicil dari tombol bayar di baris lapak.
   Belum ada tarif Jaspro di produksi, jadi penerbitan saat ini akan menghasilkan 0 tagihan.
3. **Fase mobile tagihan** (belum mulai): kartu tagihan per lapak, input cicilan, tampilkan sisa
   setelah bayar; mobile belum menulis `bill_id`, sehingga pembayaran cicilan harus lewat web/RPC.
4. **Laporan tagihan**: realisasi vs target per tahun + daftar tunggakan per umur (belum dibuat).
5. **Fase 2 mobile**: `scan_page.dart` membaca URL/token QR (satu QR untuk petugas & pemilik)
   + tombol notifikasi `wa.me`.
6. **Path-based URL** `/admin/*`, `/market/*` — ditunda; hash deep-link masih kanonik.
7. Opsional: toast menggantikan sebagian `alert`, focus-trap modal, pembersihan inline style.
