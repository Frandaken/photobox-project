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

  // Tulis ke file temp lokal dulu, karena samba-client butuh path file sumber
  const tmpPath = path.join(os.tmpdir(), `photobox-${Date.now()}-${remoteFileName}`);
  await fs.writeFile(tmpPath, buffer);

  try {
    await client.sendFile(tmpPath, remoteFileName);
  } finally {
    // Selalu bersihkan file temp meski upload gagal
    await fs.unlink(tmpPath).catch(() => {});
  }
}
