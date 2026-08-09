import axios from "axios";

/**
 * Modul integrasi Nextcloud:
 * 1. Upload file lewat WebDAV
 * 2. Buat public share link lewat OCS Share API
 *
 * Memakai App Password (bukan password akun biasa) untuk keamanan —
 * App Password bisa dicabut sewaktu-waktu tanpa ganti password utama,
 * dan sebaiknya dibatasi scope-nya di sisi Nextcloud kalau memungkinkan.
 */

function getAuthHeader() {
  const user = process.env.NEXTCLOUD_USERNAME;
  const pass = process.env.NEXTCLOUD_APP_PASSWORD;
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Upload buffer file ke Nextcloud lewat WebDAV.
 * Otomatis membuat folder tujuan kalau belum ada.
 */
export async function uploadToNextcloud(buffer, remoteFileName) {
  const baseUrl = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USERNAME;
  const folder = process.env.NEXTCLOUD_UPLOAD_FOLDER || "PhotoboxHasil";

  const davBase = `${baseUrl}/remote.php/dav/files/${user}`;
  const folderUrl = `${davBase}/${folder}`;
  const fileUrl = `${folderUrl}/${remoteFileName}`;

  const headers = { Authorization: getAuthHeader() };

  // Pastikan folder tujuan ada (MKCOL akan gagal diam-diam kalau sudah ada, itu OK)
  await axios
    .request({ method: "MKCOL", url: folderUrl, headers })
    .catch((err) => {
      // 405 Method Not Allowed = folder sudah ada, ini bukan error sebenarnya
      if (err.response?.status !== 405) throw err;
    });

  await axios.put(fileUrl, buffer, {
    headers: { ...headers, "Content-Type": "application/octet-stream" },
  });

  return `/${folder}/${remoteFileName}`; // path relatif di dalam Nextcloud
}

/**
 * Membuat public share link untuk file yang sudah diupload.
 * Menggunakan OCS Share API bawaan Nextcloud.
 */
export async function createShareLink(remotePath) {
  const baseUrl = process.env.NEXTCLOUD_URL;
  const url = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;

  const res = await axios.post(
    url,
    new URLSearchParams({
      path: remotePath,
      shareType: "3", // 3 = public link
      permissions: "1", // read-only
    }),
    {
      headers: {
        Authorization: getAuthHeader(),
        "OCS-APIRequest": "true",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: { format: "json" },
    }
  );

  const shareUrl = res.data?.ocs?.data?.url;
  if (!shareUrl) {
    throw new Error("Nextcloud tidak mengembalikan share URL yang valid");
  }
  return shareUrl;
}
