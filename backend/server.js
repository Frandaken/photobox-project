import "dotenv/config";
import express from "express";
import { uploadToSmb } from "./smbUpload.js";
import { uploadToNextcloud, createShareLink } from "./nextcloud.js";

const app = express();

// Batas ukuran body dinaikkan karena kita kirim gambar sebagai base64
// (beberapa foto original + 1 hasil komposit bisa cukup besar).
app.use(express.json({ limit: "50mb" }));

/**
 * Konversi dataURL (format "data:image/jpeg;base64,xxxx") jadi Buffer.
 */
function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

/**
 * POST /api/upload
 * Body: { finalImage: dataURL, originalPhotos: dataURL[] }
 *
 * Alur failsafe:
 * 1. Coba upload semua file ke NAS via SMB (penyimpanan utama/arsip)
 * 2. Coba upload file gabungan ke Nextcloud + generate share link (untuk QR)
 * 3. Kalau salah satu/keduanya gagal, kembalikan error yang jelas ke frontend
 *    — frontend sendiri sudah punya failsafe lapis berikutnya (unduh lokal
 *    langsung dari browser, tanpa perlu backend sama sekali).
 */
app.post("/api/upload", async (req, res) => {
  const { finalImage, originalPhotos = [] } = req.body;

  if (!finalImage) {
    return res.status(400).json({ error: "finalImage wajib diisi" });
  }

  const sessionId = Date.now();
  const finalFileName = `photobox-${sessionId}-final.jpg`;

  try {
    // --- Tahap 1: simpan arsip ke NAS via SMB ---
    // Ini best-effort untuk arsip; kalau gagal, tetap lanjut coba Nextcloud
    // supaya user tetap dapat link QR walau arsip NAS bermasalah.
    try {
      await uploadToSmb(dataUrlToBuffer(finalImage), finalFileName);
      await Promise.all(
        originalPhotos.map((photo, i) =>
          uploadToSmb(
            dataUrlToBuffer(photo),
            `photobox-${sessionId}-original-${i + 1}.jpg`
          )
        )
      );
    } catch (smbErr) {
      console.warn("[SMB] Gagal menyimpan arsip ke NAS:", smbErr.message);
      // sengaja tidak melempar error di sini — lanjut ke Nextcloud
    }

    // --- Tahap 2: upload ke Nextcloud + buat share link ---
    const remotePath = await uploadToNextcloud(
      dataUrlToBuffer(finalImage),
      finalFileName
    );
    const shareUrl = await createShareLink(remotePath);

    return res.json({ shareUrl });
  } catch (err) {
    console.error("[Upload] Gagal total (SMB & Nextcloud):", err.message);
    return res.status(502).json({
      error: "Tidak bisa mengunggah ke penyimpanan jaringan saat ini",
      detail: err.message,
    });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Photobox backend jalan di port ${port}`);
});
