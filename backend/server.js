import "dotenv/config";
import express from "express";
import path from "path";
import {
  uploadToSmb,
  checkSmbConnection,
  checkNextcloudConnection,
} from "./smbUpload.js";
import {
  getLayouts,
  saveLayouts,
  getBackgrounds,
  saveBackgrounds,
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

  const sessionId = Date.now();
  const finalFileName = `photobox-${sessionId}-final.jpg`;

  try {
    const finalUploadResult = await uploadToSmb(
      dataUrlToBuffer(finalImage),
      finalFileName
    );
    await Promise.all(
      originalPhotos.map((photo, i) =>
        uploadToSmb(
          dataUrlToBuffer(photo),
          `photobox-${sessionId}-original-${i + 1}.jpg`
        )
      )
    );

    return res.json({
      saved: true,
      storage: finalUploadResult,
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
  const smbResult = await checkSmbConnection();
  const nextcloudResult = await checkNextcloudConnection();

  res.json({
    local: {
      active: true,
      directory: process.env.DATA_DIR || path.join(process.cwd(), "data"),
    },
    smb: smbResult,
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

const port = process.env.PORT || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`Photobox backend jalan di http://0.0.0.0:${port}`);
});
