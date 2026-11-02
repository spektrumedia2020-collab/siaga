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

## 4. Transaksi retribusi (mobile, offline-first — Fase 1–2, 2026-11-02)

```
login (butuh sinyal sekali) → offline_sync_coordinator.start()
  → cache master pasar (market_cache_service): lapak, pemilik, tarif+irama, jenis, tagihan,
    pembayaran hari ini → tabel cache_* di siaga_offline.db
  → sinkron otomatis: onConnectivityChanged · app resume · timer 2 menit · setelah simpan

scan QR / buka lapak
  → baca cache dulu; bila tidak ada & online → Supabase (lalu tetap bisa jatuh ke cache)
  → transaction_page: nominal & nama pemilik dari cache
  → cek dobel harian: cache_paid_today + outbox lokal (server dicek bila online)
  → simpan ke outbox {client_uuid, stall, rate, nominal, metode, occurred_at}
  → struk: ID perangkat + banner "Menunggu sinkron" (bila belum terkirim)

sync_service (saat online)
  → upsert transactions on conflict uuid_transaction (ignore duplicates)
  → cicilan tagihan: rpc pay_retribution_bills(..., p_client_uuid) — pengiriman ulang
    mengembalikan alokasi lama tanpa menagih dua kali (migration 027)
  → presensi: upsert attendance on conflict client_uuid (migration 027)
      → terkirim → outbox/attendance ditandai synced + server_id
      → error jaringan → retry backoff 30 dtk…30 mnt
      → error validasi/RLS → status failed (dicoba ulang saat Sinkron manual)
```

Setoran (butuh unggah foto bukti) masih online-only. Lihat
[modules/mobile-officer.md](../modules/mobile-officer.md).

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
Scan QR / buka /lapak/<token>  → PublicStallPage
  → GET /api/lapak?token=<public_token>   (fallback lama: ?marketId&code)
  → service role: stalls (by token) + markets + tarif + 50 transaksi terakhir
  → tampilkan status & riwayat lapak (tanpa PIN)
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
