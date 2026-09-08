# Akses Laporan Perumda

Halaman laporan tersedia di `/perumda` dan hanya menampilkan data agregat seluruh pasar.

## Environment Variables

Wajib tersedia di deployment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PERUMDA_JWT_SECRET`
- `PERUMDA_PIN_HASH` (disarankan untuk produksi)
- `PERUMDA_PIN` (opsi sederhana untuk development atau pemulihan akses)

PIN yang diketik pada halaman `/perumda` adalah PIN asli 6 digit, bukan hash.
Contoh: jika PIN yang dipilih adalah `123456`, masukkan `123456` pada halaman login.

Untuk membuat hash PIN 6 digit:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('123456', 12))"
```

Salin hanya hasil yang diawali `$2b$12$...` ke Vercel sebagai nilai `PERUMDA_PIN_HASH`.
Jangan salin tanda kutip, perintah terminal, atau teks `123456` ke variable hash.

Untuk development lokal, konfigurasi paling sederhana adalah:

```env
PERUMDA_PIN=123456
```

Jika `PERUMDA_PIN_HASH` dan `PERUMDA_PIN` sama-sama diisi, aplikasi memakai `PERUMDA_PIN`.
Ini memudahkan pemulihan ketika hash lama masih tersimpan di Vercel. Setelah berhasil login,
hapus `PERUMDA_PIN` dan gunakan hanya `PERUMDA_PIN_HASH` untuk produksi.

## Isi Laporan

Laporan menyediakan filter tanggal, jumlah pasar, jumlah lapak, transaksi lunas, total retribusi, total setoran yang disetujui, dan perbandingan kinerja per pasar.

Token akses berlaku satu jam dan disimpan hanya selama tab browser aktif.