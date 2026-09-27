import React, { useEffect, useRef, useState } from "react";
import { renderComposition, drawStickers, canvasToDataUrl } from "../utils/compositor.js";

/**
 * DigitalCopy
 * Merender hasil akhir beresolusi penuh (komposisi frame + background + foto + stiker),
 * mengunggah otomatis ke penyimpanan (SMB NAS / Nextcloud / Disk lokal),
 * dan menyediakan tombol unduh langsung ke perangkat pengguna.
 */
const UPLOAD_ENDPOINT = "/api/upload";

export default function DigitalCopy({
  layout,
  background,
  chosenPhotos,
  stickers,
  allOriginalPhotos,
  onDone,
  onBack,
}) {
  const canvasRef = useRef(null);
  const [finalDataUrl, setFinalDataUrl] = useState(null);
  const [status, setStatus] = useState("rendering"); // rendering | uploading | success | failed
  const [storageResult, setStorageResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Render komposisi akhir
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const canvas = canvasRef.current;
      await renderComposition(canvas, layout, background, chosenPhotos);
      await drawStickers(canvas, stickers);
      const dataUrl = canvasToDataUrl(canvas, 0.95);
      if (!cancelled) {
        setFinalDataUrl(dataUrl);
        setStatus("uploading");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [layout, background, chosenPhotos, stickers]);

  // 2. Upload otomatis ke backend (NAS SMB / Nextcloud / Fail-safe Lokal)
  useEffect(() => {
    if (status !== "uploading" || !finalDataUrl) return;

    let cancelled = false;
    async function tryUpload() {
      try {
        const res = await fetch(UPLOAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalImage: finalDataUrl,
            originalPhotos: allOriginalPhotos,
          }),
        });

        if (!res.ok) throw new Error(`Server status ${res.status}`);

        const data = await res.json();
        if (!data?.saved) throw new Error("Respons server tidak valid");

        if (!cancelled) {
          setStorageResult(data.storage);
          setStatus("success");
        }
      } catch (err) {
        console.warn("Upload gagal, fallback ke unduh lokal:", err);
        if (!cancelled) {
          setErrorMsg(err.message);
          setStatus("failed");
        }
      }
    }

    tryUpload();
    return () => {
      cancelled = true;
    };
  }, [status, finalDataUrl, allOriginalPhotos]);

  const handleDownloadFinal = () => {
    if (!finalDataUrl) return;
    const a = document.createElement("a");
    a.href = finalDataUrl;
    a.download = `photobox-${Date.now()}-frame.jpg`;
    a.click();
  };

  const handleDownloadOriginals = () => {
    (allOriginalPhotos || []).forEach((photo, idx) => {
      const a = document.createElement("a");
      a.href = photo;
      a.download = `photobox-original-${idx + 1}.jpg`;
      a.click();
    });
  };

  return (
    <div style={styles.wrap} className="screen-fade">
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack} className="btn-interactive">
          ‹ Kembali
        </button>
        <span style={styles.stepLabel}>Salinan Digital</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Hasil Frame Kamu</h2>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={styles.previewWrap}>
          {finalDataUrl ? (
            <img
              src={finalDataUrl}
              alt="Hasil akhir photobox"
              style={styles.previewImg}
            />
          ) : (
            <div style={styles.previewLoading}>Menyusun hasil frame foto…</div>
          )}
        </div>

        {/* Status Uploading */}
        {status === "uploading" && (
          <div style={styles.statusBox}>
            <span style={styles.spinner} /> Menyimpan ke penyimpanan server/NAS…
          </div>
        )}

        {/* Status Berhasil */}
        {status === "success" && (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              ✓ <b>Tersimpan aman!</b>{" "}
              {storageResult?.smb
                ? "Tersimpan ke NAS (SMB) & Penyimpanan Server."
                : storageResult?.nextcloud
                ? "Tersimpan ke Nextcloud & Penyimpanan Server."
                : "Tersimpan ke penyimpanan server (folder data)."}
            </p>
            <div style={styles.downloadRow}>
              <button
                style={styles.btnSecondary}
                onClick={handleDownloadFinal}
                className="btn-interactive"
              >
                ⬇ Unduh Hasil Frame
              </button>
              {allOriginalPhotos?.length > 0 && (
                <button
                  style={styles.btnOutline}
                  onClick={handleDownloadOriginals}
                  title="Unduh semua foto jepretan asli tanpa frame"
                  className="btn-interactive"
                >
                  ⬇ Unduh {allOriginalPhotos.length} Foto Asli
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status Gagal / Offline */}
        {status === "failed" && (
          <div style={styles.failedBox}>
            <p style={styles.failedText}>
              ⚠ Tidak dapat menyinkronkan ke NAS saat ini
              {errorMsg ? ` (${errorMsg})` : ""}. Kamu tetap dapat langsung
              mengunduh hasil fotomu ke perangkat ini:
            </p>
            <div style={styles.downloadRow}>
              <button
                style={styles.btnSecondary}
                onClick={handleDownloadFinal}
                className="btn-interactive"
              >
                ⬇ Unduh Hasil Frame ke HP / Komputer
              </button>
              {allOriginalPhotos?.length > 0 && (
                <button
                  style={styles.btnOutline}
                  onClick={handleDownloadOriginals}
                  className="btn-interactive"
                >
                  ⬇ Unduh {allOriginalPhotos.length} Foto Asli
                </button>
              )}
            </div>
          </div>
        )}

        <div style={styles.ctaRow}>
          <button
            style={{
              ...styles.btnPrimary,
              ...(finalDataUrl ? {} : styles.btnDisabled),
            }}
            disabled={!finalDataUrl}
            onClick={() => onDone(finalDataUrl)}
            className="btn-interactive"
          >
            Lanjut ke Cetak / Print 🖨
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#FFFDF8",
    fontFamily: "'Courier New', ui-monospace, monospace",
    color: "#1E1A16",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "2px solid #1E1A16",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#8A8073",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  stepLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 16,
    maxWidth: 480,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 20,
    margin: "0 0 12px",
  },
  previewWrap: {
    background: "#EDE7D9",
    border: "2px solid #1E1A16",
    borderRadius: 10,
    padding: 12,
    display: "flex",
    justifyContent: "center",
    marginBottom: 12,
  },
  previewImg: {
    maxWidth: "100%",
    maxHeight: 360,
    borderRadius: 4,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  previewLoading: {
    fontSize: 11,
    color: "#8A8073",
    padding: 40,
  },
  statusBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    color: "#8A8073",
    marginBottom: 12,
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid #D9D2C2",
    borderTopColor: "#D8482E",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  successBox: {
    background: "#EAF3EF",
    border: "1.5px solid #3E7C6B",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  successText: {
    fontSize: 11,
    margin: "0 0 10px",
    lineHeight: 1.5,
  },
  failedBox: {
    background: "#FFF3EE",
    border: "1.5px solid #D8482E",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  failedText: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  downloadRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  btnSecondary: {
    display: "block",
    width: "100%",
    background: "#1E1A16",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: 10,
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: 11,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  btnOutline: {
    display: "block",
    width: "100%",
    background: "transparent",
    color: "#1E1A16",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: 8,
    fontFamily: "inherit",
    fontSize: 10,
    cursor: "pointer",
    fontWeight: "bold",
  },
  ctaRow: {
    marginTop: "auto",
    paddingTop: 14,
  },
  btnPrimary: {
    display: "block",
    width: "100%",
    background: "#D8482E",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: 14,
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  btnDisabled: {
    background: "#D9D2C2",
    cursor: "not-allowed",
  },
};
