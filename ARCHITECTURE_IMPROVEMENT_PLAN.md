# Architecture Improvement Plan - SIAGA

## Sprint 1: Security Fixes (Priority: CRITICAL)

### Week 1: Credential Security
- [ ] **Remove hardcoded Supabase credentials**
  - Update `mobile/.env.example` - ganti dengan placeholder
  - Update `.env.template` - pastikan tidak ada credential aktif
  - Add `.env` to `.gitignore` (sudah ada)

### Week 2: Password Authentication Fix
- [ ] **Implement proper Supabase Auth for officers**
  - [ ] Buat officers di Supabase Auth (bukan plain text password)
  - [ ] Update mobile login flow di `main.dart` line 262-289
  - [ ] Tambahkan password hashing di backend
  - [ ] Hapus kolom password dari tabel officers

### Week 3: Security Headers & Validation
- [ ] **Add security middleware**
  - [ ] Implement CSP headers di Vite/Express
  - [ ] Tambah rate limiting untuk auth endpoints
  - [ ] Input validation di semua form submissions

---

## Sprint 2: Backend & RLS (Priority: HIGH)

### Week 1: Database Policies
- [ ] **Create RLS policies untuk tabel utama**
  - [ ] `officers` table policies
  - [ ] `transactions` table policies
  - [ ] `stalls` table policies
  - [ ] `stall_owners` table policies
  - [ ] `market_retribusi` table policies

### Week 2: Backend Layer
- [ ] **Setup API layer**
  - [ ] Buat Express server untuk business logic
  - [ ] Middleware untuk validasi request
  - [ ] Error handling centralized
  - [ ] API versioning (v1)

### Week 3: Data Seeding Migration
- [ ] **Move data seeding ke backend**
  - [ ] Hapus seeding logic dari frontend
  - [ ] Buat migration scripts
  - [ ] Seed default markets lewat SQL

---

## Sprint 3: Frontend Refactoring (Priority: MEDIUM)

### Week 1: State Management
- [ ] **Install Zustand/Redux Toolkit**
  - [ ] `npm install zustand`
  - [ ] Buat store untuk auth state
  - [ ] Buat store untuk market data
  - [ ] Buat store untuk officer data

### Week 2: API Layer
- [ ] **Create typed API client**
  - [ ] Buat file `../lib/api.ts`
  - [ ] Type definitions untuk semua endpoints
  - [ ] Error response standardization
  - [ ] Loading state management

### Week 3: Component Cleanup
- [ ] **Refactor App.tsx**
  - [ ] Pisahkan role checking ke hook
  - [ ] Hapus magic strings
  - [ ] Cleanup useEffect subscriptions
- [ ] **Add Error Boundary**
  - [ ] Buat ErrorBoundary component
  - [ ] Wrap main App component

---

## Sprint 4: Flutter Refactoring (Priority: MEDIUM)

### Week 1: Clean Architecture Structure
- [ ] **Create folder structure**
  ```
  lib/
  ├── core/
  │   ├── constants/
  │   ├── utils/
  │   └── theme/
  ├── features/
  │   ├── auth/
  │   ├── lapak/
  │   ├── transaksi/
  │   └── setoran/
  ├── services/
  │   ├── supabase_service.dart
  │   └── api_client.dart
  └── shared/
      ├── widgets/
      └── models/
  ```

### Week 2: Service Layer
- [ ] **Extract Supabase calls**
  - [ ] Buat SupabaseService class
  - [ ] Hapus duplicate legacy table code
  - [ ] Centralize error handling
  - [ ] Buat model classes untuk response

### Week 3: State Management
- [ ] **Setup Riverpod**
  - [ ] Install riverpod package
  - [ ] Buat providers untuk auth
  - [ ] Buat providers untuk market data
  - [ ] Refactor widget state management

---

## Sprint 5: Testing & CI/CD (Priority: LOW)

### Week 1: Testing Setup
- [ ] **Frontend testing**
  - [ ] Buat test untuk roleUtils
  - [ ] Buat test untuk supabase client
  - [ ] Component tests untuk halaman utama
- [ ] **Flutter testing**
  - [ ] Widget tests untuk login page
  - [ ] Unit tests untuk service layer

### Week 2: CI/CD Pipeline
- [ ] **GitHub Actions**
  - [ ] Lint check workflow
  - [ ] Build workflow untuk web
  - [ ] Build workflow untuk Flutter (Android/iOS)
  - [ ] Deploy ke Vercel/Netlify

### Week 3: Documentation
- [ ] **API Documentation**
  - [ ] Buat OpenAPI spec
  - [ ] Generate Swagger UI
- [ ] **Developer Guide**
  - [ ] Setup guide (README update)
  - [ ] Architecture diagram

---

## Estimated Timeline

| Sprint | Duration | Priority |
|--------|----------|----------|
| Sprint 1 | 3 minggu | CRITICAL 🔴 |
| Sprint 2 | 3 minggu | HIGH 🟠 |
| Sprint 3 | 3 minggu | MEDIUM 🟡 |
| Sprint 4 | 3 minggu | MEDIUM 🟡 |
| Sprint 5 | 2 minggu | LOW 🟢 |

**Total: ~14 minggu (3.5 bulan)**

---

## Success Metrics

- [ ] Tidak ada hardcoded credentials di repo
- [ ] Semua password di-hash (tidak plain text)
- [ ] RLS policies aktif untuk semua tabel
- [ ] Test coverage minimal 50%
- [ ] Zero critical security vulnerabilities
- [ ] Clean separation antara web & mobile code