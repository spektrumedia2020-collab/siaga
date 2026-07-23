# SiAga Officer - Flutter Mobile App

Aplikasi mobile untuk petugas penarik retribusi pasar.

## 🚀 Fitur Utama

- **Login Officer** - Autentikasi dengan Supabase
- **Scan QR Lapak** - Scan QR code menggunakan kamera
- **Transaksi Retribusi** - Input pembayaran retribusi
- **Bukti Transaksi** - Bagikan & cetak struk (PDF)
- **Manajemen Lapak** - Lihat detail lapak dan pedagang

## 📱 Tech Stack

- Flutter 3.x
- Riverpod (State Management)
- GoRouter (Routing)
- Supabase (Backend & Auth)
- Mobile Scanner (QR Code)
- Share Plus (Sharing)
- Printing (PDF/Print)

## 📂 Struktur Folder

```
lib/
├── core/
│   ├── theme/
│   │   └── app_theme.dart      # Theme & colors
│   └── providers.dart          # Riverpod providers
├── config/
│   └── router.dart             # GoRouter configuration
├── features/
│   ├── landing/
│   │   └── landing_page.dart
│   ├── auth/
│   │   └── login_page.dart
│   ├── dashboard/
│   │   └── dashboard_page.dart
│   ├── scan/
│   │   └── scan_page.dart
│   ├── transaction/
│   │   └── transaction_page.dart
│   ├── lapak/
│   │   └── lapak_page.dart
│   ├── payment/
│   │   └── payment_page.dart
│   ├── receipt/
│   │   └── receipt_page.dart
│   ├── shop/
│   │   └── shop_page.dart
│   └── summary/
│       └── summary_page.dart
├── services/
│   ├── auth_service.dart
│   └── stall_repository.dart
└── shared/
    └── models/
        └── stall.dart          # Data models
```

## 🔧 Setup

1. Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```

2. Isi nilai environment variables di `.env`:
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Install dependencies:
```bash
flutter pub get
```

4. Run aplikasi:
```bash
flutter run
```

## 🛠️ Roadmap

- [ ] Fitur Absensi dengan GPS
- [ ] Offline support (SQLite)
- [ ] Sinkronisasi data
- [ ] Halaman Profil Officer
- [ ] Ringkasan & Laporan

## 📝 Catatan

Project ini mengikuti Clean Architecture dengan pemisahan folder:
- `core/` - Theme, constants, utilities
- `config/` - Router, providers
- `features/` - UI pages per fitur
- `services/` - Repository & API services  
- `shared/` - Model & widget bersama