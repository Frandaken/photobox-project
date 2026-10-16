import "dotenv/config";
import express from "express";
import path from "path";
import {
  uploadPhoto,
  checkNextcloudConnection,
  getSessionPaths,
} from "./smbUpload.js";
import {
  getLayouts,
  saveLayouts,
  getBackgrounds,
  saveBackgrounds,
  getStickers,
  saveStickers,
} from "./dataStore.js";
import { verifyPin, requireAdminAuth } from "./adminAuth.js";

const app = express();

// Batas ukuran body 50MB untuk dataURL base64 foto resolusi tinggi
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
 * Simpan hasil akhir + foto original ke NAS (SMB / Nextcloud / Fail-safe Lokal)
 */
app.post("/api/upload", async (req, res) => {
  const { finalImage, originalPhotos = [] } = req.body;

  if (!finalImage) {
    return res.status(400).json({ error: "finalImage wajib diisi" });
  }

  // Kategorisasikan path berdasarkan hierarki: PHOTOBOX/YYYY/MM/DDMMYY/SESI DDMMYY HHMMSS
  const sessionInfo = getSessionPaths(new Date());

  try {
    // Unggah foto hasil (frame gabungan) dan buat link share publik view-only dari Nextcloud
    const finalUploadResult = await uploadPhoto(
      dataUrlToBuffer(finalImage),
      sessionInfo.finalRelativePath,
      true,
      sessionInfo.sessionDir // Tautan share publik Nextcloud mengarah ke folder sesi
    );

    // Unggah foto-foto pose asli ke dalam folder sesi yang sama
    if (originalPhotos.length > 0) {
      Promise.all(
        originalPhotos.map((photo, i) =>
          uploadPhoto(
            dataUrlToBuffer(photo),
            sessionInfo.getOriginalRelativePath(i + 1),
            false
          )
        )
      ).catch((err) => console.warn("[Upload] Gagal upload foto asli:", err.message));
    }

    return res.json({
      saved: true,
      sessionName: sessionInfo.sessionName,
      sessionDir: sessionInfo.sessionDir,
      storage: finalUploadResult,
      shareUrl: finalUploadResult.shareUrl || null,
      totalPhotos: 1 + originalPhotos.length,
    });
  } catch (err) {
    console.error("[Upload] Gagal menyimpan:", err.message);
    return res.status(502).json({
      error: "Tidak bisa menyimpan ke penyimpanan saat ini",
      detail: err.message,
    });
  }
});

app.get("/api/layouts", async (_req, res) => {
  try {
    res.json(await getLayouts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/backgrounds", async (_req, res) => {
  try {
    res.json(await getBackgrounds());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stickers", async (_req, res) => {
  try {
    res.json(await getStickers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ============================================================
// Endpoint admin (butuh PIN)
// ============================================================

app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  const token = verifyPin(pin);
  if (!token) {
    return res.status(401).json({ error: "PIN salah" });
  }
  res.json({ token });
});

app.get("/api/admin/status", requireAdminAuth, async (_req, res) => {
  const nextcloudResult = await checkNextcloudConnection();

  res.json({
    local: {
      active: true,
      directory: process.env.DATA_DIR || path.join(process.cwd(), "data"),
    },
    nextcloud: nextcloudResult,
  });
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

app.put("/api/admin/stickers", requireAdminAuth, async (req, res) => {
  const stickers = req.body;
  if (!Array.isArray(stickers)) {
    return res.status(400).json({ error: "Body harus berupa array stiker" });
  }
  await saveStickers(stickers);
  res.json({ saved: true });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Photobox backend jalan di http://0.0.0.0:${port}`);
});
