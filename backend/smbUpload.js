import SambaClient from "samba-client";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Normalisasi alamat SMB dari format Windows (\\192.168.1.1\share)
 * menjadi format standar UNC URL (//192.168.1.1/share)
 */
export function normalizeSmbAddress(addr) {
  if (!addr) return "";
  let clean = addr.trim().replace(/\\+/g, "/");
  if (!clean.startsWith("//")) {
    clean = "//" + clean.replace(/^\/+/, "");
  }
  return clean;
}

/**
 * Simpan ke direktori lokal (selalu dieksekusi sebagai fail-safe)
 */
async function saveToLocalDisk(buffer, remoteFileName) {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const uploadDir = path.join(dataDir, "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const targetPath = path.join(uploadDir, remoteFileName);
  await fs.writeFile(targetPath, buffer);
  return targetPath;
}

/**
 * Upload ke Nextcloud via WebDAV API (HTTP/HTTPS)
 */
export async function uploadToNextcloud(buffer, remoteFileName) {
  const nextcloudUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;
  const folder = (process.env.NEXTCLOUD_UPLOAD_FOLDER || "").replace(/^\/+|\/+$/g, "");

  if (!nextcloudUrl || !username || !password) {
    return false;
  }

  const baseUrl = nextcloudUrl.replace(/\/+$/, "");
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  // Pastikan direktori folder tujuan ada di Nextcloud (MKCOL bertingkat)
  if (folder) {
    const parts = folder.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath += (currentPath ? "/" : "") + part;
      const mkcolUrl = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}/${encodeURI(currentPath)}`;
      try {
        await fetch(mkcolUrl, {
          method: "MKCOL",
          headers: { Authorization: authHeader },
        });
      } catch {
        // Abaikan jika folder sudah ada (405)
      }
    }
  }

  const targetPath = folder ? `${folder}/${remoteFileName}` : remoteFileName;
  const putUrl = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}/${encodeURI(targetPath)}`;

  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": "image/jpeg",
    },
    body: buffer,
  });

  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`Nextcloud WebDAV status ${res.status}: ${res.statusText}`);
  }

  return true;
}

/**
 * Cek koneksi ke Nextcloud WebDAV
 */
export async function checkNextcloudConnection() {
  const nextcloudUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;

  if (!nextcloudUrl || !username || !password) {
    return { configured: false };
  }

  const baseUrl = nextcloudUrl.replace(/\/+$/, "");
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  const checkUrl = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}/`;

  try {
    const res = await fetch(checkUrl, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        Depth: "0",
      },
    });

    if (res.ok || res.status === 207) {
      return { configured: true, connected: true };
    }
    return { configured: true, connected: false, detail: `Status ${res.status} ${res.statusText}` };
  } catch (err) {
    return { configured: true, connected: false, detail: err.message };
  }
}

/**
 * Upload ke NAS via SMB
 */
async function uploadToSmbOnly(buffer, remoteFileName) {
  if (!process.env.SMB_ADDRESS) {
    return false;
  }

  const smbAddress = normalizeSmbAddress(process.env.SMB_ADDRESS);
  const client = new SambaClient({
    address: smbAddress,
    username: process.env.SMB_USERNAME,
    password: process.env.SMB_PASSWORD,
    domain: process.env.SMB_DOMAIN || undefined,
    customArgs: ["--max-protocol=SMB3", "--option=client min protocol=NT1"],
  });

  const uploadDir = (process.env.SMB_UPLOAD_DIR || "").replace(/^\/+|\/+$/g, "");
  const remotePath = uploadDir ? `${uploadDir}/${remoteFileName}` : remoteFileName;

  if (uploadDir) {
    await client.mkdir(uploadDir).catch(() => {});
  }

  const tmpPath = path.join(os.tmpdir(), `photobox-${Date.now()}-${remoteFileName}`);
  await fs.writeFile(tmpPath, buffer);

  try {
    await client.sendFile(tmpPath, remotePath);
    return true;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

/**
 * uploadToSmb
 * Menulis buffer gambar ke tujuan penyimpanan:
 * 1. Selalu simpan ke folder disk lokal (data/uploads) sebagai fail-safe utama
 * 2. Coba upload ke Nextcloud jika dikonfigurasi
 * 3. Coba upload ke SMB NAS jika dikonfigurasi
 */
export async function uploadToSmb(buffer, remoteFileName) {
  // 1. Selalu simpan lokal
  await saveToLocalDisk(buffer, remoteFileName);

  const results = {
    local: true,
    smb: false,
    nextcloud: false,
    smbError: null,
    nextcloudError: null,
  };

  // 2. Coba upload ke Nextcloud jika ada env
  if (process.env.NEXTCLOUD_URL) {
    try {
      results.nextcloud = await uploadToNextcloud(buffer, remoteFileName);
    } catch (err) {
      console.warn("[Nextcloud] Gagal upload:", err.message);
      results.nextcloudError = err.message;
    }
  }

  // 3. Coba upload ke SMB jika ada env
  if (process.env.SMB_ADDRESS) {
    try {
      results.smb = await uploadToSmbOnly(buffer, remoteFileName);
    } catch (err) {
      console.warn("[SMB] Gagal upload ke NAS:", err.message);
      results.smbError = err.message;
    }
  }

  return results;
}

/**
 * checkSmbConnection
 * Uji koneksi SMB dengan me-list isi direktori share.
 */
export async function checkSmbConnection() {
  if (!process.env.SMB_ADDRESS) {
    return { configured: false };
  }

  const smbAddress = normalizeSmbAddress(process.env.SMB_ADDRESS);
  const client = new SambaClient({
    address: smbAddress,
    username: process.env.SMB_USERNAME,
    password: process.env.SMB_PASSWORD,
    domain: process.env.SMB_DOMAIN || undefined,
    customArgs: ["--max-protocol=SMB3", "--option=client min protocol=NT1"],
  });

  try {
    await client.list(process.env.SMB_UPLOAD_DIR || ".");
    return { configured: true, connected: true, address: smbAddress };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      address: smbAddress,
      detail: err.message,
    };
  }
}
