import "dotenv/config";
import express from "express";
import path from "path";
import {
  uploadPhoto,
  checkNextcloudConnection,
  getSessionPaths,
} from "./backend/smbUpload.js";
import {
  getLayouts,
  saveLayouts,
  getBackgrounds,
  saveBackgrounds,
  getStickers,
  saveStickers,
  resetDefaults,
} from "./backend/dataStore.js";
import { verifyPin, requireAdminAuth } from "./backend/adminAuth.js";

async function startServer() {
  const app = express();

  // Allow larger payload for base64 image data
  app.use(express.json({ limit: "50mb" }));

  function dataUrlToBuffer(dataUrl: string): Buffer {
    const base64 = dataUrl.split(",")[1];
    return Buffer.from(base64, "base64");
  }

  // ============================================================
  // Public Endpoints
  // ============================================================

  app.post("/api/upload", async (req, res) => {
    const { finalImage, originalPhotos = [] } = req.body;

    if (!finalImage) {
      return res.status(400).json({ error: "finalImage wajib diisi" });
    }

    // Kategorisasikan path berdasarkan hierarki: PHOTOBOX/YYYY/MM/DDMMYY/SESI DDMMYY HHMMSS
    const sessionInfo = getSessionPaths(new Date());

    try {
      const finalUploadResult = await uploadPhoto(
        dataUrlToBuffer(finalImage),
        sessionInfo.finalRelativePath,
        true,
        sessionInfo.sessionDir
      );

      if (originalPhotos.length > 0) {
        Promise.all(
          originalPhotos.map((photo: string, i: number) =>
            uploadPhoto(
              dataUrlToBuffer(photo),
              sessionInfo.getOriginalRelativePath(i + 1),
              false
            )
          )
        ).catch((err: any) => console.warn("[Upload] Gagal upload foto asli:", err?.message));
      }

      return res.json({
        saved: true,
        sessionName: sessionInfo.sessionName,
        sessionDir: sessionInfo.sessionDir,
        storage: finalUploadResult,
        shareUrl: finalUploadResult.shareUrl || null,
        totalPhotos: 1 + originalPhotos.length,
      });
    } catch (err: any) {
      console.error("[Upload] Gagal menyimpan:", err?.message);
      return res.status(502).json({
        error: "Tidak bisa menyimpan ke penyimpanan saat ini",
        detail: err?.message,
      });
    }
  });

  app.get("/api/layouts", async (_req, res) => {
    try {
      res.json(await getLayouts());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backgrounds", async (_req, res) => {
    try {
      res.json(await getBackgrounds());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/stickers", async (_req, res) => {
    try {
      res.json(await getStickers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // ============================================================
  // Admin Endpoints
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

  app.post("/api/admin/reset-defaults", requireAdminAuth, async (req, res) => {
    const { type = "all" } = req.body || {};
    const result = await resetDefaults(type);
    res.json({ reset: true, ...result });
  });

  // Sajikan file foto volume storage secara statis jika dibutuhkan
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  app.use("/uploads", express.static(dataDir));
  app.use("/uploads", express.static(path.join(dataDir, "uploads")));

  // ============================================================
  // Vite Integration / Static Assets
  // ============================================================

  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Photobox app running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
