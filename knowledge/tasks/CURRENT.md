# CURRENT — Task Aktif

**Sesi:** SESSION-2026-11-02-1 · **Update:** 2026-11-02T14:00:00+07:00 · **Branch:** `main` @ `e7fcc2d`

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
| 69 | QR agar terbaca Google Lens | **SELESAI (deploy)** | Quiet zone 4 modul di PNG/SVG (1094×1301), padding modal 16px, ECC level M, hint "Pindai dengan kamera atau Google Lens"; commit `2ad882c`; CI `41199724848` |
| 70 | Kontak pengelola per pasar + admin global | **SELESAI (deploy)** | Migration 024 (`markets.contact_phone`, `app_settings` + RLS admin); tab **Pengaturan** di superadmin; field di Edit Pasar; kontak NGD 081320118218 terpasang; panel Lupa PIN menampilkan WhatsApp `wa.me/6281320118218` + Telepon `tel:+6281320118218`; commit `26f848e`; CI `41201324549` |
| 71 | Pesan WhatsApp otomatis untuk tambah nomor HP | **SELESAI (deploy)** | `pin_status` mengirim `stall_code`; redaksi final: "Halo pengelola Niaga Daya, saya pemilik lapak NGD-0150. Saya ingin mendaftarkan nomor HP untuk lapak ini. Nomor HP saya: [tulis nomer hape kamu di sini]"; commit `6a7716c`, `c91e799`; CI `41203656367` |
| 72 | Satu QR untuk petugas dan pemilik | **SELESAI (deploy)** | Satu tombol QR; nilai `https://siaga.app/lapak/<token>?code=<kode>`; parser mobile `extractStallCode` di scan + dashboard; flutter analyze/test PASS; commit `8c86252`, test `3460f37`; CI `41203460029` |
| 73 | Form Pemilik tidak mengosongkan nomor HP | **SELESAI (deploy)** | `OwnersPage.handleSubmit` membaca phone terbaru dari DB dan mempertahankannya bila field form kosong; commit `63ea191`; CI `41204219315`. Nomor diisi ulang lewat modal lapak: M. Saleh (NGD-0001) 081320118218, Rusdi (NGD-0159) 081234567890 — 2/740 pemilik |
| 74 | Terbitkan tagihan Jaspro 2025 + 2026 | **SELESAI (data produksi)** | Tarif seragam Rp 5.600.000 untuk 1.396 lapak (types_id 104); tagihan 1.396/tahun; total Rp 7.817.600.000 per tahun (outstanding Rp 15.635.200.000); UI admin + halaman pemilik terverifikasi |
| 75 | Uji cicilan FIFO satu lapak | **SELESAI (dengan data uji)** | Rollback: Rp 1.000.000 → 2025 CICILAN, 2026 tetap; overpay ditolak; residu 0. UI nyata: Rp 1.000 di NGD-0001 (tx 287693, bill 11/2025) → admin "Dicicil" sisa 11.199.000, pemilik lihat cicilan Rp 1.000. Pembayaran uji masih tersimpan |
| 76 | Mobile: kartu tagihan + bayar cicilan | **SELESAI (kode, APK terpasang)** | `lapak_page.dart`: daftar tagihan tahunan + status + sisa; dialog bayar (nominal bebas, Tunai/QRIS) → RPC FIFO; hasil alokasi + sisa; analyze No issues, test 5/5; commit `ac67b82`; CI `41205835011`. APK release 76,7 MB dibangun (Kotlin incremental off), terpasang di 23124RA7EO (Android 15); aplikasi terbuka di Login — uji tagihan butuh login pemilik |
| 77 | Deploy APK ke perangkat fisik | **SELESAI (terpasang, belum diuji)** | Build `./gradlew assembleRelease -Pkotlin.incremental=false` (workaround cache Kotlin); install setelah aplikasi lama dihapus (signature mismatch, disetujui pemilik); app terbuka di layar Login |
| 78 | Hapus hint kredensial + buat akun petugas | **SELESAI (deploy)** | Hint kredensial dihapus dari `login_page.dart`; APK dibangun ulang & di-install ulang (screenshot login bersih, CI `41209128746`). Akun petugas `petugas.ngd@siaga.id` (users id 36, OFFICER, market 39, auth_uid terisi); password acak diserahkan via file temp, tidak di repo |
| 79 | Kembalikan ikon QR di tombol Lapak | **SELESAI (deploy)** | Tombol QR tunggal kembali memakai `IconQr` (sebelumnya ikon tautan sehingga terlihat hilang); commit `27a29dc`; CI `41210272481`; modal tetap `QR Lapak` + `?code`. Mobile memang tidak menampilkan QR (hanya scanner) |
| 80 | Percepat loading halaman lapak setelah scan | **SELESAI (deploy)** | Query paralel + hapus fetch ganda + tagihan dimuat menyusul + progress bar; commit `60378c1`, `d52c797`; CI `41210713215`; di perangkat halaman + tagihan tampil ±2 detik |
| 81 | Snackbar scan tidak menutupi tombol | **SELESAI (deploy)** | Snackbar 'QR terdeteksi' dihapus dari scan & dashboard scanner, diganti getaran; QR NGD-0176 berhasil dipindai dari layar dan tombol Temukan Lapak terlihat; commit `448ade1`; CI `41211186173` |
| 82 | Tata letak tab Retribusi mobile | **SELESAI (deploy)** | Harian di atas (hanya penanda bila sudah bayar), Tagihan Tahunan, lalu Retribusi Lain; tipe non-harian dengan tagihan membuka dialog cicilan, yang lunas nonaktif label 'Lunas'. Commit `e66928f`; CI `41211965086`; terverifikasi di NGD-0150. Insiden uji: transaksi harian 287696 (Rp 5.000 QRIS) tercipta tak sengaja dan masih tersimpan |
| 83 | Tombol "Kembali ke Lapak" di bukti transaksi | **SELESAI (kode, APK terpasang)** | `receipt_page.dart` menambah tombol outline kembali ke `/lapak/<lapakId>`; Bagikan/Print/Transaksi Baru tetap. Analyze bersih, test 5/5; commit `9954fd4`; CI `41212519692`. Belum diuji visual (butuh pembayaran) |
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
| 84 | UI irama penagihan per tarif lapak | **SELESAI (kode, belum deploy)** | `StallsPage` dialog rate: pilihan Harian/Mingguan (anchor Senin–Minggu)/Bulanan (tanggal 1–31), disembunyikan untuk jenis TAHUNAN; daftar rate menampilkan "Penagihan: …"; kolom `collection_period`/`collection_anchor` ikut disimpan. Typecheck + build PASS |
| 85 | Tab Tagihan Periode di halaman Tagihan | **SELESAI (kode, belum deploy)** | `MarketBillsPage` dipisah tab **Tahunan** / **Mingguan / Bulanan**; tabel periode (Lapak, Pemilik, Jenis+irama, Periode, Jatuh tempo, Tagihan, Dibayar, Sisa, Status, Aksi), filter jenis/status/cari, paginasi 25, dialog bayar per periode (FIFO). Modal **Terbitkan Periode**: mode periode berjalan (belum aktif sampai migration 026) atau rentang tanggal ≤31 hari. Verifikasi browser lokal: kedua tab, modal, dan label tarif tampil; screenshot tampilan tidak tersedia (permukaan browser tersembunyi) |
| 86 | Mobile offline Fase 1 (outbox + cache + auto-sync) | **SELESAI (kode, belum APK)** | `siaga_offline.db` v2: outbox `client_uuid` → `transactions.uuid_transaction` (upsert idempoten, tanpa migrasi server), cache lapak/pemilik/tarif/jenis/tagihan/pembayaran hari ini, `offline_sync_coordinator` (listener konektivitas, resume, timer 2 menit, backoff 30 dtk–30 mnt, retry manual untuk `failed`). Pembayaran harian offline-first + struk "menunggu sinkron"; lapak & riwayat memakai cache/outbox; dashboard & landing menampilkan status nyata + jumlah pending/gagal. `flutter analyze` 0 issue, `flutter test` 8/8. Belum: APK, cicilan tagihan offline, absensi/setoran |
| 87 | Mobile offline Fase 2 (cicilan tagihan + presensi) | **SELESAI (migration 027 applied & terverifikasi)** | Outbox `kind=BILL_PAYMENT` (+`types_id`) → RPC `pay_retribution_bills(p_client_uuid)` idempoten; dialog tagihan offline membatasi jumlah dengan sisa dikurangi antrean; presensi check-in/out lokal (`attendance.client_uuid`) + upsert saat sinkron. Cache tagihan disegarkan setelah antrean tagihan selesai. `flutter analyze` 0 issue, `flutter test` 8/8. Migration 027 dijalankan pemilik 2026-11-02; verifikasi pooler: signature 7 argumen, `authenticated`/`service_role` saja, kedua kolom + unique index presensi ada, replay uuid sama tetap 1 baris Rp 1.000, panggilan 6 argumen lama tetap jalan, residu rollback 0. Setoran tetap online-only |
| 88 | Tab Lapak offline (bug "Gagal memuat data") | **SELESAI (terpasang di perangkat)** | `ShopPageBody` memakai cache saat offline/kegagalan jaringan (`cachedStalls`/`cachedSectors`), banner "Data lapak tersimpan di perangkat", nama pasar disimpan di meta; pemuat cache halaman lapak menangkap `Error` juga agar tidak layar merah. Terverifikasi di 23124RA7EO tanpa sinyal: daftar 72 lapak Blok I, detail NGD-0073 (tarif + tagihan 2025/2026), dialog cicilan menampilkan mode offline; setelah sinyal pulih judul menjadi "Pasar Niaga Daya (54 lapak)". APK 21:59 terpasang |
| 89 | E2E antrean cicilan offline (Rp 1.000) | **SELESAI (terverifikasi DB)** | Di 23124RA7EO tanpa sinyal: NGD-0073 → Bayar/Cicil Rp 1.000 "Tunai" → dialog "Pembayaran tercatat (status: offline)". DB saat offline tetap 6.434 transaksi / 0 `client_uuid`. Setelah sinyal dipulihkan, sinkron otomatis: total 6.435, satu baris tx **287722** (bill 83/2025, Rp 1.000, `client_uuid d6885c96-7d74-45d2-86f4-605d86fa9ea5`, waktu 22:21 WITA sesuai saat offline), sisa 2025 menjadi Rp 5.599.000. Replay uuid sama via pooler mengembalikan alokasi sama tanpa menambah baris (tetap 6.435). Pembayaran uji nyata ini dihapus 2026-11-03 dengan izin tertulis (transaksi 6.435 → 6.432) |
| 90 | E2E antrean presensi offline | **SELESAI (terverifikasi DB), 2 baris uji menunggu izin hapus** | Dua bug ditemukan & diperbaiki: (a) timestamp absensi dikirim tanpa offset → server bergeser; kini dikonversi UTC; (b) `upsert(onConflict client_uuid)` gagal senyap karena index 027 **parsial**; sync diganti insert → bila `23505` update per `client_uuid`. Profil petugas (nama/pasar) di-cache saat dashboard online agar check-in offline tidak gagal. Hasil: check-in 22:43 WIB saat offline tidak masuk DB (0 baris), setelah sinyal pulih tersinkron satu baris `id 7` (`check_in 15:43Z`, `check_out null`, `client_uuid ef3c99fb-…`). Baris uji `id 6` (check-in/out 15:31–15:32Z) dan `id 7` masih ada di `attendance` |
| 91 | Batasi absensi 1× per hari (migration 028) | **SELESAI (migration applied & terverifikasi, APK terpasang)** | `migrations/028_attendance_one_per_day.sql` dijalankan pemilik 2026-11-03. Verifikasi pooler: kolom `attendance_date`, trigger `trg_set_attendance_date`, unique index `attendance_one_per_day`; insert pertama OK (tanggal terisi), insert kedua ditolak `23505`, residu rollback 0. Aplikasi: tombol "Absensi hari ini selesai" setelah check-out, guard lokal+server sebelum check-in, konflik `23505` saat sinkron tidak diulang. `flutter analyze` 0 issue; APK guard terpasang di 23124RA7EO |
| 92 | Set irama penagihan per lapak (multi-select) | **SELESAI (kode, belum deploy)** | Tombol **Irama Penagihan** di halaman Lapak membuka dialog: pilih jenis non-tahunan, irama (Harian/Mingguan+hari/Bulanan+tanggal), filter sektor/cari, checkbox per lapak (50/halaman), “Pilih semua hasil filter”, lalu Simpan menerapkan `collection_period` + `collection_anchor` ke tarif terpilih (chunk 200). Mengubah irama tidak menerbitkan tagihan. Data lapak diambil terpisah dengan paginasi agar melewati batas 1000 baris. Typecheck + build PASS; uji UI lokal: 1.396 lapak tampil benar, pilih semua = 1.396, Batal tidak mengubah data (tetap 1.396 HARIAN + 1.396 TAHUNAN). Diverifikasi visual di browser Qoder (screenshot dialog: filter, tabel, paginasi, pilih semua, Batal, Simpan). Tombol sekunder sempat tak terlihat karena aturan `.btn-secondary` landing bocor ke modal — diperbaiki di `c10101e` |
| 93 | Audit tombol sekunder & scoping CSS landing | **SELESAI (deploy)** | `.btn-secondary` landing (putih transparan) bocor global sehingga tombol tak terlihat di halaman/modal lain. Aturan `.btn`, `.btn-primary`, `.btn-secondary`, `.container`, `.navbar*`, `.section`, `.dot` landing di-scope ke `.market-landing`; tombol sekunder kini memakai gaya aplikasi (teks gelap). Audit kontras otomatis di halaman Lapak, Kategori, Retribusi, Transaksi, Petugas serta modal irama, tarif, terbitkan tagihan/periode, bayar, dan edit pemilik: tidak ada tombol dengan rasio < 2,5. Commit `481ba12` (header) + `7a7bd87` (scoping); CI `41550851125` success; CSS produksi `index.X6Bbu_4A.css` terverifikasi |
| 94 | Kontras teks "Pilih Pasar" | **SELESAI (deploy)** | Tombol pasar `.market-picker-item` mewarisi `color:#fff` dari aturan global `button` sementara latarnya terang, sehingga nama pasar tak terlihat. Ditambahkan `color:#0b1f3a` pada tombol dan `strong`. Verifikasi DOM: teks navy `rgb(11,31,58)` di latar `rgb(248,250,252)`. Audit seluruh halaman dashboard + Tema: tidak ada tombol nyata lain di bawah rasio 3 (kartu tema punya label berwarna sendiri). Commit `3b9cfe0`; CI success; CSS produksi `index.DW8yDrUs.css` terverifikasi |
| 95 | Kontras tombol Logout (header & sidebar) | **SELESAI (deploy)** | Tombol header masih membawa gradien global di balik teks navy; tombol sidebar memakai warna yang ditimpa aturan `.sidebar-item`. Keduanya kini solid: header `#152c5b` di `#e3ecff` (hover navy/putih), sidebar `#b3261e` di latar transparan (hover `#fdecea`), tanpa `background-image`. Verifikasi DOM + screenshot lokal. Commit `645672f`; CI success; CSS produksi `index.CTS2UdZi.css` memuat `.sidebar-item.sidebar-logout` |
| 96 | Redaksi menu Tagihan + audit logika mingguan | **SELESAI (deploy)** | Sidebar “📄 Tagihan Tahunan” → “📄 Tagihan”; judul halaman menjadi “📄 Tagihan” dengan subjudul per tab; pesan setup generik. Uji rollback mingguan: tarif MINGGUAN anchor Senin (hari ini Selasa 3 Nov 2026) menghasilkan tagihan **2–8 Nov 2026**, Rp 35.000 (7×5.000), jatuh tempo 8 Nov, `period_year=2026`, `period_kind=MINGGUAN`; panggilan ulang tetap 1 baris; bayar Rp 10.000 FIFO ke tagihan mingguan (sisa 25.000); rollback residu 0. Tidak ditemukan bug pada perhitungan minggu; semua tarif produksi masih HARIAN sehingga belum ada tagihan mingguan nyata. Commit `59005bb` |
| 97 | Tagihan mingguan nyata + otomatisasi pg_cron | **SELESAI (migration 029 applied & terverifikasi)** | 5 lapak (NGD-0001…0005, jenis 103, anchor Senin) berirama MINGGUAN; tagihan **2–8 Nov 2026 Rp 35.000/lapak** ada (5 baris, total Rp 175.000, jatuh tempo 8 Nov). `generate_current_period_bills(39,103)` dipanggil ulang → `ensured 5`, jumlah tetap 5 (idempoten). `migrations/029_auto_generate_period_bills.sql` dijalankan pemilik 2026-11-03: pg_cron **1.6.4** aktif, job `generate_period_bills_daily` aktif dengan jadwal `5 16 * * *` (**00:05 WITA**), fungsi `run_period_billing_cron()` SECURITY DEFINER dan hanya executable oleh `postgres` (anon/authenticated ditolak). Uji manual dalam rollback: `ensured 5`, tagihan tetap 5 baris |
| 98 | Blokir penagihan harian untuk lapak berirama periode | **SELESAI (kode); migration 030 menunggu dijalankan pemilik** | Mobile: jenis berirama MINGGUAN/BULANAN disembunyikan dari daftar “Retribusi Harian”, kartu peringatan di halaman lapak, tombol bayar harian dinonaktifkan dengan pesan, dan guard di `payment_page`; cache offline ikut memfilter. Server: `migrations/030_block_daily_billing_for_period_stalls.sql` menambah trigger `trg_guard_daily_transaction_cadence` yang menolak transaksi harian (`bill_id NULL`) bila tarifnya MINGGUAN/BULANAN, sementara pembayaran tagihan (`bill_id` terisi) tetap lolos. Uji rollback: harian-mingguan ditolak, bayar tagihan lolos, harian-HARIAN lolos, residu 0 (6.432 tx). `flutter analyze` 0 issue |
| 99 | Halaman pemilik: tagihan periode | **SELESAI (deploy)** | `api/lapak.ts` mengirim `period_kind/period_start/period_end` untuk setiap tagihan, mengurutkan per periode, memberi label periode pada riwayat pembayaran (`bill_period`), dan menyembunyikan item harian untuk tarif berirama mingguan/bulanan (`today.status=TIDAK_ADA_TARIF`). `PublicStallPage`: judul “Tagihan”, tanggal rentang untuk tagihan mingguan/bulanan, banner “Ditagih mingguan/bulanan — Pembayaran melalui tagihan periode di bawah”, riwayat menampilkan rentang. Verifikasi produksi `/api/lapak` (token+PIN default): NGD-0001 mengembalikan tagihan Jaspro tahunan **dan** mingguan 2026-11-02…2026-11-08 Rp 35.000; bundle produksi memuat teks banner baru. Commit `c2ad9f4` + `3f9ca1e`; CI success |
| 100 | Kartu tagihan periode di mobile | **SELESAI (kode, APK dibangun)** | `lapak_page.dart`: daftar tagihan memakai label periode (`02 Nov 2026 – 08 Nov 2026`) untuk MINGGUAN/BULANAN/CUSTOM dan tahun untuk TAHUNAN; judul bagian “Tagihan”; dialog “Bayar Tagihan”; hasil alokasi menyebut periode tagihan, bukan hanya tahun; catatan default “Cicilan tagihan”. Query tagihan mengambil `period_kind/period_start/period_end` dan cache diurutkan `period_start`. `flutter analyze` 0 issue; APK release dibangun |

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

**Prioritas sesi berikutnya (rekomendasi):** (1) putuskan cara set irama massal lalu isi
`collection_period` — tanpa itu tagihan periode selalu 0; (2) sambungkan `api/lapak.ts` +
halaman pemilik ke `period_*` (read-only); (3) kartu tagihan periode di mobile; (4) laporan
realisasi vs target + tunggakan per umur. Semua commit hingga `74f5d0f` sudah di-push, CI hijau.

1. Baca urutan resume: `state.json` → `index/index-state.json` → `context.md` → `memory.md` → `00_INDEX.md` → berkas ini.
2. **Tagihan tahunan (Jaspro) live.** 1.396 tarif Rp 5.600.000/lapak dan tagihan 2025 + 2026 sudah
   terbit (masing-masing 1.396 baris); tipe 102 sudah dihapus. FIFO terbukti lewat uji rollback.
   Sisa: laporan realisasi vs target dan tunggakan per umur.
2b. **Retribusi periode (migration 025) applied 2026-11-02 dan terverifikasi** lewat uji rollback:
   tagihan mingguan (Senin–Minggu, 7×tarif harian), bulanan (anchor 31 dengan clamp akhir bulan),
   anti-overlap, terbit ulang setelah dibatalkan, FIFO periode, dan penerbitan tahunan 2027
   (1.396 baris, ulang 0). **UI admin sudah tersambung**: dialog tarif punya irama penagihan dan
   halaman Tagihan punya tab **Mingguan / Bulanan** + modal Terbitkan Periode. **Migration 026
   (`generate_current_period_bills`) dijalankan pemilik 2026-11-02 dan terverifikasi** lewat pooler:
   grant `authenticated` saja, mingguan anchor Senin (2–8 Nov, Rp 35.000), idempoten, lapak harian
   tidak tersentuh, bulanan anchor 31 (31 Okt–29 Nov, Rp 150.000), filter lapak, non-anggota ditolak,
   residu rollback 0. **Masih kurang**: `api/lapak.ts` belum membaca `period_*`, mobile belum memanggil
   `ensure_current_period_bill`. Semua tarif produksi masih `collection_period = 'HARIAN'`, jadi
   terbitkan periode berjalan akan menghasilkan 0 sampai irama diubah per lapak.
2c. **Pengaturan irama massal ditunda pemilik 2026-11-02 (lanjut besok).** Semua tarif masih
   `HARIAN`; irama hanya bisa diubah per lapak lewat dialog Retribusi. Tiga opsi yang diajukan:
   (1) dialog "set massal" per sektor/jenis di web (rekomendasi), (2) kolom `IRAMA`/`ANCHOR` di
   CSV tarif + impor ulang, (3) tetap per lapak bila hanya segelintir. Belum ada yang dikerjakan.
3. **Mobile offline Fase 1 & 2 SELESAI dan teruji E2E (2026-11-02/03).** Fase 1: outbox
   idempoten harian, cache master pasar, sinkron otomatis, pembayaran harian offline, lapak &
   riwayat offline (termasuk tab Lapak; bug "Gagal memuat data" diperbaiki `b89949d`). Fase 2:
   cicilan tagihan lewat outbox `BILL_PAYMENT` (RPC idempoten `p_client_uuid`, migration 027) dan
   presensi lokal (`attendance.client_uuid`, migration 028 = 1×/hari). E2E terverifikasi: cicilan
   Rp 1.000 offline tersinkron (lalu dihapus atas izin), check-in offline 22:43 WIB tersinkron
   satu baris UTC (lalu dihapus), cache lokal kini mengikuti server saat absensi dihapus.
   **Sisa**: APK terpasang baru di 23124RA7EO (distribusikan ke petugas lain), setoran tetap
   online-only, pertimbangkan penegakan sektor offline + UNIQUE harian server untuk pembayaran.
3b. **Tagihan periode di mobile** (belum): kartu tagihan mingguan/bulanan per lapak belum
   ditampilkan; cicilan tagihan tahunan sudah bisa lewat RPC/antrean offline. `api/lapak.ts`
   juga belum membaca `period_*` untuk halaman pemilik.
4. **Laporan tagihan**: realisasi vs target per tahun + daftar tunggakan per umur (belum dibuat).
5. **Mobile fase lanjutan**: tombol notifikasi `wa.me` ke pengelola (scan QR & satu QR sudah
   selesai pada task 72).
6. **Path-based URL** `/admin/*`, `/market/*` — ditunda; hash deep-link masih kanonik.
7. Opsional: toast menggantikan sebagian `alert`, focus-trap modal, pembersihan inline style.
