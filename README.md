# Renjana Snacks — Toko Online React + MySQL

Aplikasi toko camilan dengan **halaman login pelanggan, katalog terlindungi, keranjang, checkout, pembayaran QRIS / transfer BCA manual, dashboard admin, stok, dan promo bertingkat**. Nama toko dan materi ilustrasi awal dapat diganti lewat panel admin. Desain responsif untuk desktop dan HP.

## Struktur

```text
renjana-snacks/
├── frontend/                 React 18 + Vite + TypeScript
│   ├── src/admin/            dashboard, pesanan, produk, pengaturan
│   ├── src/pages/            login-gate, katalog, checkout, pesanan
│   ├── src/components/       kartu produk, modal akun, keranjang
│   ├── src/styles/           CSS terpisah sesuai fungsi
│   └── public/illustrations/ ilustrasi default (ganti dengan foto asli via admin)
├── backend/                  Node.js + Express REST API + mysql2
│   ├── src/routes/           rute per domain
│   ├── src/services/         logika harga, status, kedaluwarsa
│   ├── scripts/create-admin.js
│   ├── tests/                pengujian harga dan status
│   └── uploads/              dibuat otomatis, tidak masuk ZIP/Git
├── database/001_schema.sql   tabel MySQL
├── database/002_seed_products.sql 16 varian contoh
├── Setup-Windows.ps1
└── Start-Windows.ps1
```

## Cara menjalankan di Windows + XAMPP

**Prasyarat:** Node.js 20+ / 22+, npm, XAMPP MySQL versi MySQL 8.0.16+ atau MariaDB yang mendukung fitur schema; koneksi internet untuk `npm install` pertama kali.

1. Ekstrak ZIP utuh, misalnya ke `C:\xampp\htdocs\renjana-snacks`.
2. Di PowerShell pada folder proyek jalankan `powershell -ExecutionPolicy Bypass -File .\Setup-Windows.ps1`. Ini memasang dependency dan membuat `backend/.env` dengan secret login acak. Alternatif manual: copy `backend/.env.example` ke `backend/.env` lalu `npm run install:all`.
3. Jalankan **MySQL** di XAMPP. Buka **http://localhost/phpmyadmin** → Import → pilih `database/001_schema.sql`, lanjut import `database/002_seed_products.sql`. File pertama membuat database `renjana_snacks`. Import kedua boleh diulang tanpa duplikasi SKU.
4. Edit `backend/.env`: isi `DB_USER`, `DB_PASSWORD`, dan jika perlu `DB_PORT`. Default untuk XAMPP lokal sering `root` dengan password kosong, tetapi gunakan kredensial MySQL milikmu yang sebenarnya. Isi `ADMIN_EMAIL`, `ADMIN_PASSWORD` (**min. 12 karakter**) dan `ADMIN_NAME`.
5. Buat akun penjual sekali saja: `npm run admin --prefix backend`. Perintah ini **hanya boleh dijalankan oleh pemilik sistem**, bukan pelanggan. Setelah berhasil, hapus isi `ADMIN_PASSWORD` dari `.env` dan simpan kredensial di password manager.
6. Jalankan `powershell -ExecutionPolicy Bypass -File .\Start-Windows.ps1` atau `npm run dev` di root.
7. Buka URL **Website** yang ditampilkan di terminal setelah launcher memilih port kosong (biasanya **http://localhost:5173**, tetapi bisa berbeda). Login admin dengan akun langkah 5. Masuk **Seller Center → Pengaturan** dan masukkan nomor rekening BCA, nama pemilik rekening, alamat pengambilan, WhatsApp, ongkir, lalu **upload QRIS statis resmi dari penyedia pembayaran**. Tanpa konfigurasi tersebut, pelanggan tidak dapat memilih metode bayar terkait.
8. Ubah stok contoh ke stok nyata dan upload foto produk asli lewat Seller Center → Produk. Stok seed `100 pcs` dan `30 kg` hanyalah data demonstrasi.

> Untuk reset admin, edit ulang `ADMIN_EMAIL` / `ADMIN_PASSWORD` lalu jalankan perintah admin lagi. **Jangan** jalankan di server yang bisa diakses publik oleh orang lain. Tindakan ini bisa memberi role admin ke email yang telah terdaftar.

## Daftar harga bawaan

| Produk | Ukuran/rasa | Harga |
|---|---|---:|
| Basreng, Makaroni | 150 gr: Original, Pedas, Extra Pedas | Rp15.000 / pcs |
| Usus Crispy | 200 gr: Pedas | Rp20.000 / pcs |
| Kripca | 150 gr: Original | Rp10.000 / pcs |
| Basreng, Makaroni | Kiloan: Original | Rp51.000 / kg |
| Basreng, Makaroni | Kiloan: Pedas | Rp52.000 / kg |
| Basreng, Makaroni | Kiloan: Extra Pedas | Rp53.000 / kg |
| Usus Crispy | Kiloan: Pedas | Rp105.000 / kg |
| Kripca | Kiloan: Original | Rp65.000 / kg |

**Diskon:** total seluruh item kemasan (bisa campur jenis) minimal 5 pcs = Rp1.000 **per pcs**, minimal 10 pcs = Rp2.000 **per pcs**; tingkat tertinggi saja yang berlaku, tidak bertumpuk. Produk KG tidak menambah hitungan pcs, tidak menerima diskon ini. Harga dan batas diskon dapat diedit di admin. KG bisa dibeli minimal 0,25 kg dengan kontrol jumlah per 0,25 kg.

## Alur pembayaran dan stok

`Checkout → AWAITING_PAYMENT → upload bukti → PAYMENT_REVIEW → admin konfirmasi PAID → PROCESSING → READY → COMPLETED`.

- Sebelum `PAID`, **tidak ada tombol untuk memulai persiapan barang**. Admin harus memeriksa uang masuk langsung di mutasi BCA / dashboard QRIS resminya, bukan hanya percaya screenshot.
- Saat checkout, stok langsung **direservasi**. Jika belum ada bukti dan waktu pembayaran habis (default 24 jam), pesanan menjadi `EXPIRED` dan stok dikembalikan. Job pengecekan berjalan berkala dan saat halaman pesanan dibuka. Pesanan yang sedang diverifikasi tidak kedaluwarsa otomatis.
- Admin boleh menolak bukti dengan alasan, pelanggan lalu upload ulang dalam 24 jam. Pembatalan pesanan yang belum lunas mengembalikan stok. Pembatalan **setelah lunas** sengaja diblokir karena butuh prosedur refund terpisah.
- Ongkos kirim adalah **tarif flat** yang ditetapkan penjual, bukan kalkulasi ekspedisi otomatis. Default Rp0 sampai admin mengubahnya. Pengambilan sendiri Rp0.
- **QRIS saat ini statis + verifikasi manual**. Gambar yang diunggah harus QRIS merchant resmi; ini **belum** payment gateway dengan webhook, status bank otomatis, virtual account, atau QRIS dinamis. Integrasi Midtrans/Xendit/DOKU dapat menjadi fase berikutnya.

## Catatan sebelum benar-benar online / produksi

Aplikasi ini adalah **MVP fungsional, bukan sertifikasi siap produksi**. Uji dengan data dummy, transaksi kecil, dan pencatatan mutasi dahulu. Deploy dengan HTTPS + reverse proxy satu origin untuk frontend dan `/api` backend, set `NODE_ENV=production`, `COOKIE_SECURE=true`, `JWT_SECRET` unik, database user khusus dengan privilege minimum, backup database dan folder `backend/uploads`, akses admin terbatas, dan tambahkan verifikasi nomor/email serta prosedur refund sesuai kebutuhan. File `.env` dan upload tidak disertakan di ZIP.

Pada mode development yang dijalankan lewat `Start-Windows.ps1` atau `npm run dev`, launcher otomatis mencari port kosong bagi website dan API, menghubungkan proxy, serta mengizinkan origin localhost/127.0.0.1 dan alamat IPv4 LAN komputer pada port website terpilih. Jika menggunakan domain kustom atau proxy lain, masukkan origin tambahan di `backend/.env` sebagai `FRONTEND_ORIGIN` (dipisahkan koma). Jangan gunakan wildcard origin untuk sesi login. Tidak perlu mengubah `.env` hanya karena port terpakai.

### Uji port otomatis

`npm run test:ports` menguji deteksi port terpakai dan pilihan port baru tanpa mematikan aplikasi lain. Jalankan `Start-Windows.ps1` untuk menampilkan URL terbaru setiap kali startup.

### Uji logika inti

`npm run test --prefix backend`

Meliputi hitung tier diskon 4/5/10 pcs, KG terpisah, ongkir, batas maksimum diskon, dan larangan persiapan barang sebelum verifikasi. Karena lingkungan pembuat ZIP ini tidak dapat mengunduh dependency dan tidak menyediakan server MySQL, pengujian integrasi browser ↔ API ↔ MySQL perlu dijalankan di komputer pengguna setelah langkah setup.
