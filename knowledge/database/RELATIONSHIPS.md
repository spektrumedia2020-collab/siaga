# RELATIONSHIPS — SIAGA

Status: **INFERRED** dari FK di SQL + pola query kode. Verifikasi ke DB aktual: **belum**.

## Graf relasi utama

```
auth.users (Supabase)
   ├─1:1─ users.auth_uid            (profil aplikasi, id_role + market_id legacy)
   ├─1:N─ user_roles.user_id        (peran per pasar)
   ├─1:1─ officers.user_id          (profil petugas)
   └─1:N─ setoran.officer_id / approved_by_*

roles 1:N user_roles.role_id
roles 1:N users.id_role            (jalur lama, masih dipakai fallback)

markets
   ├─1:N─ stalls.market_id
   ├─1:N─ market_sectors.market_id
   ├─1:N─ market_config.market_id
   ├─1:N─ announcements.market_id
   ├─1:N─ retribution_rates.market_id
   ├─1:N─ officers.market_id
   ├─1:N─ attendance.market_id
   ├─1:N─ setoran.market_id
   ├─1:N─ user_roles.market_id
   └─1:N─ transactions.market_id
markets.id_head_market ──N:1── users.id_user   (kepala pasar)

stall_owners 1:N stalls.owner_id
market_sectors 1:N stalls.sector_id
stall_categories 1:N stalls.category_id

retribution_types 1:N retribution_rates.types_id
stalls 1:N retribution_rates.stall_id           (stall_id nullable → tarif level pasar)

stalls 1:N transactions.stall_id
stalls 1:N attendance? (tidak ada FK terlihat)
```

## Relasi kardinalitas penting

| Relasi | Kardinalitas | Catatan |
|---|---|---|
| `users` ↔ `auth.users` | 1:1 via `auth_uid` | `auth_uid` nullable pada data lama |
| `user_roles` | N per user | UNIQUE(`user_id`,`role_id`,COALESCE(`market_id`,-1)) |
| `markets.id_head_market` → `users.id_user` | N:1 | Kepala pasar juga bisa ditentukan lewat `user_roles` (dual source) |
| `setoran` → transaksi | **tidak ada FK** | Agregasi jumlah, bukan relasi baris |
| `transactions` → `stalls`/`markets` | N:1 | Konsistensi market↔stall dijaga trigger (klaim, `UNKNOWN`) |

## Skema ganda (legacy vs baru)

```
BARU:  stalls (id, code, number, qr_code, market_id, owner_id)
LEGACY: lapak (id_lapak, kode_lapak, nomor_lapak, id_pemilik)
BARU:  stall_owners (id, name)
LEGACY: pemilik_lapak (id_pemilik, nama_pemilik)
```

Mobile melakukan **fallback** ke tabel legacy bila query tabel baru gagal/kosong
(`mobile/lib/services/stall_repository.dart`, `features/payment/payment_page.dart`).
Artinya kedua skema harus tetap konsisten sampai migrasi selesai — risiko drift tinggi.
