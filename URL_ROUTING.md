# SIAGA URL Routing System

## URL Parameters untuk Dashboard

### Super Admin Dashboard
```
#superadmin/dashboard
#admin
```
- Menampilkan: Stats grid, Analytics charts
- Akses: ADMIN role only

### Market Admin Dashboard  
```
#market/dashboard
#market/stalls
#market/officers
#market/transactions
```
- Menampilkan: Market-specific data
- Akses: MARKET_HEAD, ADMIN_PASAR, PASAR_ADMIN role

## Route Structure

| URL Hash | Komponen | Role Required |
|----------|----------|---------------|
| `#superadmin/dashboard` | SuperAdminDashboardImproved | ADMIN |
| `#market/dashboard` | MarketDashboard | MARKET_HEAD & variants |
| `#market/stalls` | StallsPage | MARKET_HEAD & variants |
| `#market/officers` | OfficersPage | MARKET_HEAD & variants |
| `#` / empty | Auth/Login | All |

## Profile Button Location

Header di kanan atas:
```tsx
<div className="header-actions">
  <button className="siaga-btn siaga-btn-outline profile-btn">
    👤 {userEmail.split('@')[0]}
  </button>
</div>
```

Dropdown profile muncul ketika tombol diklik, berisi:
- Email user
- Role (Superadmin/Admin Pasar)
- Tombol Logout

## Analytics Charts di Dashboard

### Tab Overview
- 4 stat cards (Total Pasar, Lapak, Petugas, Revenue)

### Tab Analytics  
- Line Chart: Trend Pendapatan Harian
- Bar Chart: Trend Transaksi Harian
- Pie Chart: Status Pasar (Aktif/Non-Aktif)
- Bar Chart Horizontal: Top 5 Pasar (Revenue)

## Cara Pakai di Browser

1. Login sebagai ADMIN → otomatis redirect ke `#superadmin/dashboard`
2. Login sebagai MARKET_HEAD → otomatis redirect ke `#market/dashboard`
3. Manual navigation: ubah URL hash di browser