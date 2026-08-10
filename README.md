# Photobox

Aplikasi photobox self-hosted:

```
Idle -> Pilih Layout -> Pilih Background -> Sesi Foto -> Pilih Foto Terbaik
     -> Overlay Stiker -> Digital Copy (simpan ke NAS) -> Done (Print)
```

Admin Panel (gembok pojok kanan atas, dikunci PIN) tersedia di semua layar
untuk mengelola Layout & Background, dan melihat status koneksi NAS.

## Struktur proyek

```
frontend/           -> React + Vite, semua UI/alur, di-build jadi statis & di-serve nginx
  src/
    App.jsx          -> state machine alur lengkap + overlay Admin Panel
    components/       -> satu file per layar
      AdminLockButton.jsx -> ikon gembok + modal PIN
      AdminPanel.jsx      -> kelola Layout/Background + status NAS
    data/
      stickers.js       -> data stiker (masih hardcode; Layout & Background
                           sekarang diambil dari backend, bukan hardcode lagi)
    utils/
      compositor.js   -> gabung layout+background+foto+stiker jadi 1 gambar (canvas)
backend/             -> Node/Express
  server.js           -> semua endpoint (publik + admin)
  smbUpload.js        -> upload ke NAS via SMB + cek koneksi
  dataStore.js        -> penyimpanan Layout & Background (file JSON di /app/data)
  adminAuth.js        -> verifikasi PIN + token sesi admin
docker-compose.yml    -> 2 service: frontend (port 8095) + backend (port 3001)
```

## Menjalankan di laptop (development)

Butuh [Node.js](https://nodejs.org) versi 20+.

**Backend** (jalankan dulu, karena frontend butuh API-nya):
```bash
cd backend
cp .env.example .env
# edit .env: isi kredensial SMB, ADMIN_PIN, dll
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Buka `http://localhost:5173`. Kamera (`getUserMedia`) otomatis diizinkan browser
di `localhost`.

## Deploy ke NAS lewat Dockge

1. Push isi folder ini ke repo GitHub (public, supaya build context Git URL
   di Dockge bisa clone tanpa autentikasi).
2. Di folder stack Dockge di NAS (sejajar dengan `docker-compose.yml`), buat
   2 hal secara manual (tidak lewat GitHub):
   - File **`.env`** — isi sesuai `backend/.env.example`, dengan kredensial
     SMB asli dan `ADMIN_PIN` pilihanmu.
   - Folder **`data/`** akan dibuat otomatis oleh Docker saat pertama jalan
     (untuk menyimpan Layout & Background yang diedit lewat Admin Panel).
3. Paste isi `docker-compose.yml` ke Dockge, deploy.
4. Akses lewat `http://IP-NAS-KAMU:8095`.

### Penting soal HTTPS untuk kamera

Browser hanya mengizinkan `getUserMedia` (akses kamera) lewat HTTPS atau
`localhost`. Untuk kios yang diakses lewat IP lokal, kamera akan gagal.
Solusi: reverse proxy dengan sertifikat, atau Cloudflare Tunnel.

### Konfigurasi SMB (backend/.env)

Lihat `backend/.env.example` untuk daftar variabel lengkap:
- `SMB_ADDRESS` — alamat share utama (mis. `//192.168.1.10/photobox-share`)
- `SMB_UPLOAD_DIR` — subfolder DI DALAM share itu tempat hasil foto disimpan
  (dibuat otomatis kalau belum ada; kosongkan untuk simpan di root share)
- `ADMIN_PIN` — PIN untuk membuka Admin Panel. **Wajib diisi** — kalau
  kosong, Admin Panel akan menolak semua akses (fail-safe: lebih baik
  terkunci daripada terbuka tanpa sengaja).

### Alur penyimpanan (SMB saja, tanpa Nextcloud)

Setelah stiker ditempel, hasil akhir (1 file gabungan) dan semua foto
original dikirim ke backend, yang menyimpannya langsung ke NAS lewat SMB.
Kalau upload SMB gagal (NAS mati, kredensial salah, dll), frontend otomatis
menampilkan tombol "Unduh ke perangkat ini" sebagai failsafe — user tetap
bisa membawa pulang hasilnya lewat unduhan langsung di kios.

### Print

Layar "Done" menampilkan tombol cetak yang memanggil `window.print()`,
tapi HANYA gambar hasil akhir yang tercetak (bukan seluruh halaman) —
dicapai lewat CSS `@media print` di `index.css` yang menyembunyikan semua
elemen UI dan hanya menampilkan `<img>` hasil akhir saat proses print.

## Admin Panel

Diakses lewat ikon gembok 🔒 di pojok kanan atas (muncul di semua layar).
Setelah PIN benar, admin bisa:
- Melihat status koneksi NAS (SMB) real-time
- Menambah/mengedit/menghapus **Layout** (nama, ukuran kertas, ukuran
  kanvas, dan posisi/ukuran tiap slot foto lewat input angka)
- Menambah/mengedit/menghapus **Background** (nama + warna)

Perubahan tersimpan langsung ke `backend/data/*.json` (di-mount sebagai
volume Docker) dan langsung terlihat di kios tanpa perlu rebuild frontend.

## Yang masih belum dikembangkan

- Editor Layout masih berbasis form angka (x/y/width/height per slot),
  belum drag-drop visual.
- Background masih warna solid, belum gambar PNG yang bisa diupload admin.
- Integrasi printer fisik khusus (foto/thermal) — saat ini pakai print
  dialog bawaan browser.
