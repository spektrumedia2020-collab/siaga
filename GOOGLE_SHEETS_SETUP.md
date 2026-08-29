# 📊 Google Sheets Integration Setup Guide

Panduan lengkap untuk setup Google Sheets integration di aplikasi SIAGA - Sistem Informasi Retribusi Pasar.

## 📋 Daftar Isi
1. [Prasyarat](#prasyarat)
2. [Langkah Setup Google Cloud Project](#langkah-setup-google-cloud-project)
3. [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
4. [Testing & Troubleshooting](#testing--troubleshooting)
5. [Deployment](#deployment)
6. [FAQ](#faq)

---

## 🔑 Prasyarat

Sebelum memulai, pastikan Anda memiliki:
- Akun Google (Gmail) yang aktif
- Akses ke [Google Cloud Console](https://console.cloud.google.com/)
- Editor teks untuk mengedit file `.env.local`
- Access ke repository project Siaga

---

## Langkah Setup Google Cloud Project

### Step 1: Buat Google Cloud Project Baru

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Di bagian atas, klik **"Select a Project"** 
3. Klik **"NEW PROJECT"**
4. Isi form:
   - **Project name:** `Siaga Market` (atau nama pilihan Anda)
   - **Location:** Biarkan default
5. Klik **"CREATE"**
6. Tunggu project selesai dibuat (biasanya 1-2 menit)

**Screenshot indicator:**
```
Google Cloud Console > Select a Project > [Siaga Market] ✓
```

---

### Step 2: Enable Google Sheets API

1. Di Google Cloud Console, masuk ke project yang baru dibuat
2. Di search bar atas (atau cari di API library), ketik **"Google Sheets API"**
3. Klik pada hasil **"Google Sheets API"**
4. Klik tombol **"ENABLE"** (berwarna biru)
5. Tunggu hingga API teraktivasi

**Indikator sukses:**
```
✓ Google Sheets API has been enabled for project "Siaga Market"
```

---

### Step 3: Enable Google Drive API

1. Kembali ke API Library (atau search "Google Drive API")
2. Ketik **"Google Drive API"** di search bar
3. Klik pada hasil **"Google Drive API"**
4. Klik tombol **"ENABLE"**
5. Tunggu hingga API teraktivasi

**Indikator sukses:**
```
✓ Google Drive API has been enabled for project "Siaga Market"
```

---

### Step 4: Buat OAuth 2.0 Consent Screen

1. Di menu kiri Google Cloud Console, klik **"APIs & Services"** → **"OAuth consent screen"**
2. Pilih user type **"External"** → klik **"CREATE"**
3. Isi formulir OAuth consent:

#### Bagian 1: App Information
```
App name:              Siaga Market
User support email:    your-email@gmail.com
Developer contact:     your-email@gmail.com
```

4. Klik **"SAVE AND CONTINUE"**

#### Bagian 2: Scopes

1. Klik **"ADD OR REMOVE SCOPES"**
2. Cari dan tambahkan scopes berikut:
   ```
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/drive
   ```
3. Klik **"UPDATE"**
4. Klik **"SAVE AND CONTINUE"**

#### Bagian 3: Test Users (opsional)

- Anda bisa tambahkan email Google Anda sebagai test user
- Klik **"ADD USERS"**
- Masukkan email Anda
- Klik **"ADD"**
- Klik **"SAVE AND CONTINUE"**

5. Review summary dan klik **"BACK TO DASHBOARD"**

---

### Step 5: Buat OAuth 2.0 Client ID

1. Di menu kiri, klik **"APIs & Services"** → **"Credentials"**
2. Klik tombol **"+ CREATE CREDENTIALS"** di atas
3. Pilih **"OAuth 2.0 Client IDs"**
4. Jika diminta "Configure OAuth Consent Screen first", klik **"CONFIGURE CONSENT SCREEN"** dan ikuti Step 4

#### Isi form Create OAuth 2.0 Client ID:

```
Application type:     Web application
Name:                 Siaga Web App
```

#### Authorized JavaScript Origins (tambahkan):
```
http://localhost:5173
https://siaga-pi.vercel.app
```

#### Authorized Redirect URIs (tambahkan):
```
http://localhost:5173/
https://siaga-pi.vercel.app/
```

5. Klik **"CREATE"**
6. Dialog akan muncul dengan **Client ID** dan **Client Secret**
   - **COPY Client ID** (Anda membutuhkannya nanti)
   - Abaikan Client Secret untuk saat ini (tidak digunakan)

7. Klik **"OK"** atau close dialog

**Format Client ID:**
```
123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

---

### Step 6: Buat API Key

1. Di halaman **"Credentials"**, klik **"+ CREATE CREDENTIALS"**
2. Pilih **"API Key"**
3. Dialog akan muncul dengan API Key Anda
   - **COPY API Key** (Anda membutuhkannya untuk environment variables)

4. (Optional) Restrict API Key:
   - Klik "Restrict Key"
   - Pilih "Application restrictions" → "Web applications"
   - Tambahkan domain:
     ```
     localhost
     siaga-pi.vercel.app
     ```
   - Di "API restrictions", pilih "Google Sheets API" dan "Google Drive API"
   - Klik **"SAVE"**

**Format API Key:**
```
AIzaSyD... (panjang string alphanumeric)
```

---

## Konfigurasi Environment Variables

### Local Development (.env.local)

1. Di root folder project (folder `/Users/sugenghariadi/Siaga/`), buat file `.env.local`:

```bash
# Di terminal
touch .env.local
```

2. Buka file `.env.local` dan tambahkan:

```env
# Google Sheets Integration
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
VITE_GOOGLE_API_KEY=YOUR_API_KEY_HERE
```

3. Ganti:
   - `YOUR_CLIENT_ID_HERE` dengan Client ID dari Step 5
   - `YOUR_API_KEY_HERE` dengan API Key dari Step 6

**Contoh:**
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyD1234567890abcdefghijklmnop
```

4. **Jangan commit file `.env.local`** ke Git - sudah tercantum di `.gitignore`

### Vercel Deployment

Untuk production deployment di Vercel:

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Buka project **siaga-pi**
3. Pergi ke **Settings** → **Environment Variables**
4. Tambahkan:
   - **Name:** `VITE_GOOGLE_CLIENT_ID` | **Value:** [Client ID Anda]
   - **Name:** `VITE_GOOGLE_API_KEY` | **Value:** [API Key Anda]
5. Klik **"Save"**
6. Deploy ulang aplikasi (atau push ke main branch)

---

## Testing & Troubleshooting

### Test Local Development

1. Restart development server:
```bash
npm run dev
```

2. Buka browser: `http://localhost:5173`

3. Navigasi ke halaman dengan export (misal: Transactions, Reconciliations)

4. Klik tombol **Export** 🟢
   - Sebelumnya: Google Sheets button menampilkan ❌ (disabled)
   - Sekarang: Google Sheets button aktif dan hijau ✅

5. Klik **Google Sheets** → Login dengan akun Google Anda

6. Jika berhasil:
   ```
   ✓ Data berhasil diekspor ke Google Sheets!
   [Google Sheets link akan membuka di tab baru]
   ```

### Error Troubleshooting

#### ❌ Error: "Google Sheets belum dikonfigurasi"

**Masalah:** Environment variables belum diset
**Solusi:**
- Pastikan `.env.local` ada di root folder
- Pastikan variable names benar: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`
- Restart server: `npm run dev`

#### ❌ Error: "Failed to initialize Google API"

**Masalah:** Credentials tidak valid atau API tidak diaktifkan
**Solusi:**
- Verifikasi Client ID dan API Key di Google Cloud Console
- Pastikan Google Sheets API dan Drive API sudah ENABLED
- Pastikan URL (localhost:5173) ada di Authorized Origins

#### ❌ Error: "Google login error: vx"

**Masalah:** OAuth configuration tidak lengkap
**Solusi:**
- Buka Google Cloud Console
- Klik ke OAuth consent screen
- Pastikan test user atau application sudah configured
- Pastikan Authorized Origins benar

#### ❌ Error: "401 Unauthorized - Sesi expired"

**Masalah:** Access token sudah expired
**Solusi:**
- Di aplikasi, klik menu user → Logout (jika ada)
- Atau clear localStorage di browser console:
  ```javascript
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user');
  ```
- Login ulang ke Google

#### ❌ Error: "Failed to create spreadsheet"

**Masalah:** Google Drive API tidak aktif atau permission denied
**Solusi:**
- Pastikan Google Drive API sudah ENABLED di Google Cloud Console
- Pastikan permission `https://www.googleapis.com/auth/drive` ada di OAuth scopes
- Coba logout dan login ulang

---

## Deployment

### Pre-Deployment Checklist

Sebelum deploy ke production:

- [ ] `.env.local` sudah ada dengan credentials yang valid
- [ ] Google Cloud Project sudah setup dengan API keys
- [ ] Redirect URIs termasuk domain production Anda
- [ ] Scopes sudah dikonfigurasi di OAuth consent screen
- [ ] Test di local development: `npm run dev`
- [ ] CSV dan XLSX export masih berfungsi
- [ ] Google Sheets export berhasil di local

### Production URLs

Pastikan URLs production sudah ditambahkan ke Google Cloud Console:

**JavaScript Origins:**
```
https://siaga-pi.vercel.app
```

**Redirect URIs:**
```
https://siaga-pi.vercel.app/
```

### Monitoring

Setelah deploy, monitor:
1. Check console di browser (F12) untuk error Google API
2. Check error log di Vercel dashboard
3. Test export functionality di production

---

## FAQ

### Q: Apakah CSV dan XLSX export membutuhkan Google credentials?
**A:** Tidak. CSV dan XLSX export bekerja independently dan tidak memerlukan Google credentials. Google Sheets hanya optional.

### Q: Bisakah user login ke Google Sheets tanpa OAuth setup?
**A:** Tidak. Tanpa OAuth setup, Google Sheets button akan disabled dan menampilkan pesan "Google Sheets belum dikonfigurasi".

### Q: Bagaimana kalau user lupa login ke Google?
**A:** User akan melihat error: "Silakan login ke Google terlebih dahulu". Mereka bisa klik tombol Google Sheets lagi untuk memicu login popup.

### Q: Apakah data dikirim ke server Siaga?
**A:** Data dikirim langsung ke Google Sheets API (googleapis.com), tidak melalui server Siaga. Server Siaga hanya provide data ke frontend.

### Q: Bagaimana kalau ingin reset/change credentials?
**A:** 
1. Local: Edit `.env.local` dengan credentials baru
2. Production (Vercel): Update environment variables di Vercel dashboard dan redeploy

### Q: Berapa lama credentials berlaku?
**A:** Access tokens berlaku ~1 jam. Setelah expired, user perlu login ulang ke Google.

### Q: Bisakah satu Client ID digunakan untuk multiple aplikasi?
**A:** Bisa, tapi NOT RECOMMENDED. Lebih baik buat project terpisah untuk setiap aplikasi.

### Q: Apa bedanya Client ID dan API Key?
**A:** 
- **Client ID:** Untuk OAuth authentication (user login)
- **API Key:** Untuk API access tanpa login

Kedua-duanya dibutuhkan untuk Google Sheets integration.

### Q: Bisakah menggunakan Service Account instead of OAuth?
**A:** Bisa, tapi memerlukan private key file. OAuth (user login) lebih recommended untuk user-facing features.

---

## References

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

## Support

Jika mengalami masalah atau pertanyaan:
1. Cek troubleshooting section di atas
2. Check browser console (F12) untuk error messages
3. Review Google Cloud Console untuk API status
4. Contact development team

---

**Last Updated:** 2026-08-29  
**Version:** 1.0  
**Status:** ✅ Production Ready
