import "dotenv/config";
import express from "express";
import { uploadToSmb, checkSmbConnection } from "./smbUpload.js";
import { getLayouts, saveLayouts, getBackgrounds, saveBackgrounds } from "./dataStore.js";
import { verifyPin, requireAdminAuth } from "./adminAuth.js";

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

// ============================================================
// Endpoint publik (dipakai kios/user)
// ============================================================

/**
 * POST /api/upload
 * Body: { finalImage: dataURL, originalPhotos: dataURL[] }
 *
 * Simpan hasil akhir + semua foto original ke NAS lewat SMB.
 * Kalau upload SMB gagal, frontend sudah punya failsafe sendiri
 * (tombol unduh langsung dari browser), jadi di sini kita cukup
 * kembalikan error yang jelas.
 */
app.post("/api/upload", async (req, res) => {
  const { finalImage, originalPhotos = [] } = req.body;

  if (!finalImage) {
    return res.status(400).json({ error: "finalImage wajib diisi" });
  }

  const sessionId = Date.now();
  const finalFileName = `photobox-${sessionId}-final.jpg`;

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
    return res.json({ saved: true });
  } catch (err) {
    console.error("[SMB] Gagal menyimpan ke NAS:", err.message);
    return res.status(502).json({
      error: "Tidak bisa menyimpan ke penyimpanan NAS saat ini",
      detail: err.message,
    });
  }
});

app.get("/api/layouts", async (_req, res) => {
  res.json(await getLayouts());
});

app.get("/api/backgrounds", async (_req, res) => {
  res.json(await getBackgrounds());
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ============================================================
// Endpoint admin (butuh PIN)
// ============================================================

/**
 * POST /api/admin/login
 * Body: { pin: string }
 * Response: { token } kalau benar, 401 kalau salah.
 */
app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  const token = verifyPin(pin);
  if (!token) {
    return res.status(401).json({ error: "PIN salah" });
  }
  res.json({ token });
});

/**
 * GET /api/admin/status
 * Cek status koneksi ke NAS (SMB), dipakai Admin Panel untuk indikator.
 */
app.get("/api/admin/status", requireAdminAuth, async (_req, res) => {
  try {
    await checkSmbConnection();
    res.json({ smb: "connected" });
  } catch (err) {
    res.json({ smb: "error", detail: err.message });
  }
});

app.put("/api/admin/layouts", requireAdminAuth, async (req, res) => {
  const layouts = req.body;
  if (!Array.isArray(layouts)) {
    return res.status(400).json({ error: "Body harus berupa array layout" });
  }
  await saveLayouts(layouts);
  res.json({ saved: true });
});

app.put("/api/admin/backgrounds", requireAdminAuth, async (req, res) => {
  const backgrounds = req.body;
  if (!Array.isArray(backgrounds)) {
    return res.status(400).json({ error: "Body harus berupa array background" });
  }
  await saveBackgrounds(backgrounds);
  res.json({ saved: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Photobox backend jalan di port ${port}`);
});
