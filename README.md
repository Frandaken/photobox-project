# Photobox

Aplikasi photobox self-hosted:

```
Idle -> Pilih Layout -> Pilih Background -> Sesi Foto -> Pilih Foto Terbaik
     -> Overlay Stiker -> Digital Copy (QR/link) -> Done (Print)
```

## Struktur proyek

```
frontend/           -> React + Vite, semua UI/alur, di-build jadi statis & di-serve nginx
  src/
    App.jsx          -> state machine alur lengkap
    components/       -> satu file per layar
    data/             -> data contoh Layout, Background, Stiker (JSON-like)
    utils/
      compositor.js   -> gabung layout+background+foto+stiker jadi 1 gambar (canvas)
backend/             -> Node/Express, jembatan upload ke SMB (NAS) + share link Nextcloud
  server.js           -> endpoint POST /api/upload
  smbUpload.js        -> logic upload ke share SMB
  nextcloud.js        -> logic upload + share link Nextcloud (WebDAV + OCS API)
docker-compose.yml    -> 2 service: frontend (port 8088) + backend (port 3001)
```

## Menjalankan di laptop (development)

Butuh [Node.js](https://nodejs.org) versi 20+.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Buka `http://localhost:5173`. Kamera (`getUserMedia`) otomatis diizinkan browser
di `localhost`, tidak perlu HTTPS untuk testing lokal.

**Backend** (opsional untuk testing awal UI — DigitalCopy screen akan otomatis
fallback ke "unduh lokal" kalau backend tidak jalan/gagal):
```bash
cd backend
cp .env.example .env
# lalu edit .env, isi kredensial SMB & Nextcloud yang sebenarnya
npm install
npm start
```

## Deploy ke NAS lewat Dockge (tanpa perlu CLI)

1. Push seluruh isi folder ini ke repo GitHub.
2. **Penting:** buat file `backend/.env` (dari `.env.example`) dengan kredensial
   asli SMB & Nextcloud kamu. **Jangan commit file `.env` ini ke GitHub** —
   sudah ada di `.gitignore`. Kamu perlu cara lain untuk menaruh file ini di
   NAS, misalnya upload manual lewat File Station ke folder tempat compose
   akan dijalankan, sebelum deploy stack di Dockge.
3. Di Dockge, buat stack baru, paste isi `docker-compose.yml`. Sesuaikan path
   `context` di tiap service jika struktur foldermu di NAS berbeda.
4. Deploy. Docker build kedua image (frontend jadi nginx statis, backend jadi
   Node server), lalu jalan otomatis.
5. Akses lewat `http://IP-NAS-KAMU:8088`.

### Penting soal HTTPS untuk kamera

Browser hanya mengizinkan `getUserMedia` (akses kamera) lewat HTTPS atau
`localhost`. Untuk kios yang diakses lewat IP lokal (`http://192.168.x.x:8095`),
kamera akan gagal. Solusi:
- Reverse proxy (Nginx Proxy Manager / Caddy) dengan sertifikat di depan
  container frontend.
- Cloudflare Tunnel untuk expose dengan HTTPS otomatis.
- Akses langsung dari device kios lewat alamat yang menghasilkan HTTPS/localhost.

### Konfigurasi SMB & Nextcloud (backend/.env)

Lihat `backend/.env.example` untuk daftar variabel lengkap. Poin penting:
- **SMB**: butuh binary `smbclient` di sisi backend — sudah otomatis
  ter-install lewat `backend/Dockerfile` (`apk add samba-client`).
- **Nextcloud**: gunakan **App Password** (Nextcloud > Settings > Security >
  Devices & sessions > Create new app password), bukan password akun utama.

### Alur failsafe penyimpanan

1. Backend coba simpan file (hasil akhir + semua foto original) ke NAS via SMB
   sebagai arsip. Kalau ini gagal, proses tetap lanjut ke langkah 2 (arsip
   bukan syarat mutlak berhasilnya share link).
2. Backend upload file hasil akhir ke Nextcloud, lalu generate share link
   publik — ini yang ditampilkan sebagai QR code di layar Digital Copy.
3. Kalau langkah 2 juga gagal (NAS/Nextcloud tidak bisa diakses dari mana pun),
   frontend otomatis menampilkan tombol "Unduh ke perangkat ini" sebagai
   failsafe terakhir — user tetap bisa membawa pulang hasilnya lewat unduhan
   langsung di kios, tanpa perlu QR/link.

## Komponen yang masih perlu dikembangkan

- **Admin Panel**: upload Layout/Background baru + editor drag-drop untuk
  menata slot foto (saat ini data Layout/Background masih hardcode di
  `frontend/src/data/`).
- **Integrasi printer** fisik (saat ini `Done.jsx` memakai `window.print()`
  bawaan browser sebagai titik awal).
- Background saat ini masih warna solid placeholder — perlu diganti gambar
  PNG yang diupload admin (lihat komentar `TODO` di `compositor.js`).
