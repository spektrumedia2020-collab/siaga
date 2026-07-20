SIAGA - Project Brief Flutter Developer
Tujuan
Membangun aplikasi Flutter untuk petugas penarik retribusi pasar dengan konsep offline-first, QR Code, GPS, dan sinkronisasi otomatis.
Pengguna
Petugas Penarik menggunakan aplikasi mobile. Admin Pasar, Kepala Pasar, dan Admin Sistem menggunakan dashboard web.
Tech Stack
Flutter 3.x, Dart 3.x, Riverpod, Dio, GoRouter, SQLite, Mobile Scanner, Geolocator, Connectivity Plus, Workmanager.
Fitur Utama
Login JWT, Absensi, Scan QR Lapak, Transaksi Retribusi, Riwayat, Setoran, Sinkronisasi, Profil.
Alur
Login → Absensi → Scan QR → Detail Lapak → Input Pembayaran → Simpan → Sync → Setoran.
Folder
lib/core, config, features(auth, absensi, lapak, transaksi, sync, setoran, profile), shared, services.
API ke database
/auth/login, /mobile/scan-qr, /mobile/transaksi, /mobile/absensi/check-in, /mobile/absensi/check-out, /sync/upload, /sync/download, /setoran.
Offline
Gunakan SQLite, UUID transaksi, retry sync saat koneksi tersedia.
Standar
Clean Architecture, Repository Pattern, Riverpod, null safety, validasi input, logging.
Definition of Done
Login, absensi, scan QR, transaksi online/offline, sinkronisasi, riwayat transaksi, setoran berjalan dengan baik.