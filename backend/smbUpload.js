import SambaClient from "samba-client";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * uploadToSmb
 * Menulis buffer gambar ke share SMB di NAS.
 * samba-client bekerja dengan menulis file lokal sementara dulu,
 * lalu memakai binary `smbclient` (harus tersedia di image Docker)
 * untuk mengirimnya ke share.
 *
 * SMB_ADDRESS = alamat share utama (mis. //192.168.1.10/photobox-share)
 * SMB_UPLOAD_DIR = subfolder tujuan DI DALAM share itu (opsional, mis. "hasil-foto").
 * Kalau SMB_UPLOAD_DIR diisi, file akan diletakkan di dalamnya
 * (dibuat otomatis kalau folder belum ada).
 *
 * @param {Buffer} buffer - isi file (gambar)
 * @param {string} remoteFileName - nama file tujuan di dalam share SMB
 * @returns {Promise<void>}
 */
export async function uploadToSmb(buffer, remoteFileName) {
  const client = new SambaClient({
    address: process.env.SMB_ADDRESS,
    username: process.env.SMB_USERNAME,
    password: process.env.SMB_PASSWORD,
    domain: process.env.SMB_DOMAIN || undefined,
  });

  const uploadDir = (process.env.SMB_UPLOAD_DIR || "").replace(/^\/+|\/+$/g, "");
  const remotePath = uploadDir ? `${uploadDir}/${remoteFileName}` : remoteFileName;

  // Pastikan subfolder tujuan ada (best-effort; kalau sudah ada, error diabaikan)
  if (uploadDir) {
    await client.mkdir(uploadDir).catch(() => {});
  }

  // Tulis ke file temp lokal dulu, karena samba-client butuh path file sumber
  const tmpPath = path.join(os.tmpdir(), `photobox-${Date.now()}-${remoteFileName}`);
  await fs.writeFile(tmpPath, buffer);

  try {
    await client.sendFile(tmpPath, remotePath);
  } finally {
    // Selalu bersihkan file temp meski upload gagal
    await fs.unlink(tmpPath).catch(() => {});
  }
}

/**
 * checkSmbConnection
 * Uji koneksi SMB dengan me-list isi direktori root share.
 * Dipakai oleh Admin Panel untuk menampilkan status koneksi NAS.
 */
export async function checkSmbConnection() {
  const client = new SambaClient({
    address: process.env.SMB_ADDRESS,
    username: process.env.SMB_USERNAME,
    password: process.env.SMB_PASSWORD,
    domain: process.env.SMB_DOMAIN || undefined,
  });

  await client.list(process.env.SMB_UPLOAD_DIR || ".");
  return true;
}
