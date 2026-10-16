import SambaClient from "samba-client";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Cache direktori yang sudah dibuat untuk menghindari request berulang
const createdNextcloudDirs = new Set();
const createdSmbDirs = new Set();

/**
 * Format hierarki sesi sesuai spesifikasi:
 * PHOTOBOX/
 * ├── 2026/          # yyyy
 * │   ├── 04/        # mm
 * │   │   ├── 230426/ # ddmmyy
 * │   │   │   └── "SESI 230426 193326" # ddmmyy dan hhmmss foto hasil (frame gabungan)
 */
export function getSessionPaths(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = yyyy.slice(-2);
  const ddmmyy = `${dd}${mm}${yy}`;

  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const hhmmss = `${hh}${min}${ss}`;

  const sessionName = `SESI ${ddmmyy} ${hhmmss}`;
  const sessionDir = `PHOTOBOX/${yyyy}/${mm}/${ddmmyy}/${sessionName}`;
  const finalFileName = `${sessionName}.jpg`;
  const finalRelativePath = `${sessionDir}/${finalFileName}`;

  return {
    yyyy,
    mm,
    ddmmyy,
    hhmmss,
    sessionName,
    sessionDir,
    finalFileName,
    finalRelativePath,
    getOriginalRelativePath: (index) => `${sessionDir}/${sessionName} - Original ${index}.jpg`,
  };
}

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
 * Menggabungkan base folder dan relative path tanpa duplikasi folder "PHOTOBOX"
 */
export function resolveFullPath(baseFolder, relativePath) {
  const cleanBase = (baseFolder || "").replace(/^\/+|\/+$/g, "");
  const cleanRel = (relativePath || "").replace(/^\/+|\/+$/g, "");

  if (!cleanBase) return cleanRel;
  if (!cleanRel) return cleanBase;

  const baseParts = cleanBase.split("/");
  const relParts = cleanRel.split("/");
  if (baseParts[baseParts.length - 1].toUpperCase() === relParts[0].toUpperCase()) {
    return [...baseParts, ...relParts.slice(1)].join("/");
  }

  return `${cleanBase}/${cleanRel}`;
}

/**
 * Simpan ke direktori lokal (selalu dieksekusi sebagai fail-safe)
 */
async function saveToLocalDisk(buffer, remoteFilePath) {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const targetPath = path.join(dataDir, "uploads", remoteFilePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
  return targetPath;
}

/**
 * Buat tautan berbagi publik (view-only) dari Nextcloud menggunakan OCS Share API
 * @param {string} targetPath path folder/file di Nextcloud (misal: "NAS/PHOTOBOX/2026/04/230426/SESI 230426 193326")
 * @returns {Promise<string|null>} URL public share (misal: "https://nextcloud.abipraya.id/s/xyz")
 */
export async function createNextcloudShareLink(targetPath) {
  const nextcloudUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;

  if (!nextcloudUrl || !username || !password || !targetPath) {
    return null;
  }

  const baseUrl = nextcloudUrl.replace(/\/+$/, "");
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  const normalizedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

  const shareApiUrl = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json`;

  try {
    const res = await fetch(shareApiUrl, {
      method: "POST",
      headers: {
        "OCS-APIRequest": "true",
        "Accept": "application/json",
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        path: normalizedPath,
        shareType: "3", // 3 = Public Link
        permissions: "1", // 1 = Read only / view only
      }).toString(),
    });

    const data = await res.json().catch(() => null);

    if (data?.ocs?.data?.url) {
      console.log("[Nextcloud] Share link created:", data.ocs.data.url);
      return data.ocs.data.url;
    }

    // Jika share link untuk path ini sudah dibuat sebelumnya, cari share yang ada
    const queryUrl = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json&path=${encodeURIComponent(normalizedPath)}`;
    const queryRes = await fetch(queryUrl, {
      headers: {
        "OCS-APIRequest": "true",
        "Accept": "application/json",
        "Authorization": authHeader,
      },
    });
    const queryData = await queryRes.json().catch(() => null);
    const shares = queryData?.ocs?.data;
    if (Array.isArray(shares) && shares.length > 0) {
      const publicShare = shares.find((s) => s.share_type === 3 || s.url) || shares[0];
      if (publicShare?.url) {
        return publicShare.url;
      }
    }

    return null;
  } catch (err) {
    console.warn("[Nextcloud] Gagal generate share link:", err.message);
    return null;
  }
}

/**
 * Upload ke Nextcloud via WebDAV API (HTTP/HTTPS)
 * Otomatis membuat seluruh hierarki folder parent via MKCOL bertingkat
 */
export async function uploadToNextcloud(buffer, remoteFilePath, createShare = false, shareTargetPath = null) {
  const nextcloudUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;
  const baseFolder = process.env.NEXTCLOUD_UPLOAD_FOLDER || "";

  if (!nextcloudUrl || !username || !password) {
    return { success: false, shareUrl: null };
  }

  const baseUrl = nextcloudUrl.replace(/\/+$/, "");
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  const fullPath = resolveFullPath(baseFolder, remoteFilePath);
  const parentDir = fullPath.includes("/") ? fullPath.substring(0, fullPath.lastIndexOf("/")) : "";

  // Buat hierarki folder secara bertingkat (MKCOL) jika belum dicache
  if (parentDir) {
    const parts = parentDir.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath += (currentPath ? "/" : "") + part;
      if (!createdNextcloudDirs.has(currentPath)) {
        const mkcolUrl = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}/${encodeURI(currentPath)}`;
        try {
          await fetch(mkcolUrl, {
            method: "MKCOL",
            headers: { Authorization: authHeader },
          });
          createdNextcloudDirs.add(currentPath);
        } catch {
          createdNextcloudDirs.add(currentPath);
        }
      }
    }
  }

  const putUrl = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}/${encodeURI(fullPath)}`;

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

  let shareUrl = null;
  if (createShare) {
    const pathToShare = shareTargetPath ? resolveFullPath(baseFolder, shareTargetPath) : fullPath;
    shareUrl = await createNextcloudShareLink(pathToShare);
  }

  return { success: true, shareUrl, fullPath };
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
 * Pastikan direktori bertingkat dibuat di SMB share
 */
async function ensureSmbDir(client, fullDirPath) {
  if (!fullDirPath) return;
  const parts = fullDirPath.replace(/^\/+|\/+$/g, "").split("/");
  let cur = "";
  for (const part of parts) {
    cur += (cur ? "/" : "") + part;
    if (!createdSmbDirs.has(cur)) {
      try {
        await client.mkdir(cur);
      } catch {}
      createdSmbDirs.add(cur);
    }
  }
}

/**
 * Upload ke NAS via SMB
 */
async function uploadToSmbOnly(buffer, remoteFilePath) {
  if (!process.env.SMB_ADDRESS) {
    return false;
  }

  const smbAddress = normalizeSmbAddress(process.env.SMB_ADDRESS);
  const client = new SambaClient({
    address: smbAddress,
    username: process.env.SMB_USERNAME,
    password: process.env.SMB_PASSWORD,
    domain: process.env.SMB_DOMAIN || undefined,
    customArgs: ["--max-protocol=SMB3", "--option=client min protocol=NT1", "--timeout=4"],
  });

  const baseFolder = process.env.SMB_UPLOAD_DIR || "";
  const remotePath = resolveFullPath(baseFolder, remoteFilePath);
  const parentDir = remotePath.includes("/") ? remotePath.substring(0, remotePath.lastIndexOf("/")) : "";

  if (parentDir) {
    await ensureSmbDir(client, parentDir);
  }

  const tmpPath = path.join(os.tmpdir(), `photobox-${Date.now()}-${path.basename(remoteFilePath)}`);
  await fs.writeFile(tmpPath, buffer);

  try {
    await client.sendFile(tmpPath, remotePath);
    return true;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

/**
 * Upload ke SMB dengan batas waktu aman (agar tidak memblokir saat diuji di luar jaringan LAN)
 */
async function uploadToSmbWithTimeout(buffer, remoteFilePath, timeoutMs = 4500) {
  return Promise.race([
    uploadToSmbOnly(buffer, remoteFilePath),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SMB timeout (hanya dapat diakses di jaringan lokal NAS)")), timeoutMs)
    ),
  ]);
}

/**
 * uploadToSmb
 * Menulis buffer gambar ke tujuan penyimpanan:
 * 1. Selalu simpan ke folder disk lokal (data/uploads/...) sebagai fail-safe utama
 * 2. Coba upload ke Nextcloud jika dikonfigurasi (dan buat share link jika createShare === true)
 * 3. Coba upload ke SMB NAS jika dikonfigurasi
 */
export async function uploadToSmb(buffer, remoteFilePath, createShare = false, shareTargetPath = null) {
  // 1. Selalu simpan lokal
  await saveToLocalDisk(buffer, remoteFilePath);

  const results = {
    local: true,
    smb: false,
    nextcloud: false,
    shareUrl: null,
    smbError: null,
    nextcloudError: null,
  };

  // 2. Coba upload ke Nextcloud jika ada env
  if (process.env.NEXTCLOUD_URL) {
    try {
      const ncRes = await uploadToNextcloud(buffer, remoteFilePath, createShare, shareTargetPath);
      results.nextcloud = ncRes?.success || false;
      results.shareUrl = ncRes?.shareUrl || null;
    } catch (err) {
      console.warn("[Nextcloud] Gagal upload:", err.message);
      results.nextcloudError = err.message;
    }
  }

  // 3. Coba upload ke SMB jika ada env
  if (process.env.SMB_ADDRESS) {
    try {
      results.smb = await uploadToSmbWithTimeout(buffer, remoteFilePath);
    } catch (err) {
      console.warn("[SMB] Status upload NAS:", err.message);
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
    customArgs: ["--max-protocol=SMB3", "--option=client min protocol=NT1", "--timeout=4"],
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
