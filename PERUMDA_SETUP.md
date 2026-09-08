# Akses Laporan Perumda

Halaman laporan tersedia di `/perumda` dan hanya menampilkan data agregat seluruh pasar.

## Environment Variables

Wajib tersedia di deployment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PERUMDA_JWT_SECRET`
- `PERUMDA_PIN_HASH` (disarankan untuk produksi)

Untuk membuat hash PIN 6 digit:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('123456', 12))"
```

Simpan hasilnya sebagai `PERUMDA_PIN_HASH`. `PERUMDA_PIN` tetap didukung sebagai fallback sederhana untuk development lokal, tetapi tidak disarankan untuk produksi.

## Isi Laporan

Laporan menyediakan filter tanggal, jumlah pasar, jumlah lapak, transaksi lunas, total retribusi, total setoran yang disetujui, dan perbandingan kinerja per pasar.

Token akses berlaku satu jam dan disimpan hanya selama tab browser aktif.