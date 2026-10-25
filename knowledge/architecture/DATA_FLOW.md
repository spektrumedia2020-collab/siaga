# DATA_FLOW

Status: **VERIFIED** (kode) · 2026-10-25

## 1. Login web

```
Auth.tsx → supabase.auth.signInWithPassword
        → App.onAuthStateChange
        → getUserRole(user.id)  [user_roles → fallback users.id_role]
        → redirect by role: ADMIN → #superadmin/dashboard
                            role pasar → #market/dashboard
                            lainnya → login
```

## 2. CRUD admin pasar (web)

```
Page (mis. StallsPage) → lib/api.ts ApiClient → supabase.from('stalls')...
RLS mengevaluasi JWT user → baris yang diizinkan saja
```

Tidak melewati server sendiri; tidak ada logika bisnis di server untuk jalur ini.

## 3. Pembuatan user (web)

```
UserManagement.tsx → POST /api/users {email, password, fullName, roleId, marketId}
  → (Vercel) service role: auth.admin.createUser
  → insert user_roles
  → insert public.users {auth_uid, id_role, market_id, ...}
  → 201
```

Tanpa header Authorization; server tidak memeriksa siapa pemanggil. Lihat SECURITY S-01.

## 4. Transaksi retribusi (mobile, offline-first)

```
scan QR lapak → transaction_page
  → cek konektivitas
     ├─ offline → simpan ke sqflite (database_service)
     │            → sync_service mengirim saat online
     └─ online  → insert supabase.from('transactions')
  → trigger validasi market (klaim) → payment_page → receipt (PDF/print)
```

## 5. Setoran petugas & approval

```
Petugas: setoran_page → insert setoran {total_amount, transaction_count, proof_image_url,
         status='pending_treasurer'}
Bendahara (web): approve → status 'pending_head', approved_by_treasurer, approved_at_treasurer
Kepala Pasar (web): approve/reject → 'approved' | 'rejected' + rejection_reason
```

Enum status dijaga CHECK constraint (`mobile/migrations/001_init.sql:65`).

## 6. Absensi petugas

```
attendance_page → geolocator (posisi) → insert attendance {officer_id, market_id, check_in/out, lokasi*}
```

Kolom lokasi ditambah via `mobile/assets/sql/add_attendance_location_columns.sql` (status DB `UNKNOWN`).

## 7. Halaman lapak publik

```
GET /lapak/<marketId>/<kode> → PublicStallPage → POST /api/lapak {marketId, code, pin}
  → validasi PIN → service role: markets + stalls (+ transaksi terkait)
  → tampilkan status & riwayat lapak
```

## 8. Export laporan

```
exportUtils → papaparse/xlsx (lokal) atau Google Sheets API (OAuth, VITE_GOOGLE_CLIENT_ID)
```

## 9. Upload gambar

```
imageUtils (kompres) → supabase.storage.from(bucket) → public URL disimpan di kolom *_url
```

Bucket default `data-siaga`; avatar memakai bucket `avatars`.
