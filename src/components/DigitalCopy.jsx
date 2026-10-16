import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { renderComposition, drawStickers, canvasToDataUrl } from "../utils/compositor.js";

/**
 * DigitalCopy
 * Merender hasil akhir beresolusi penuh (komposisi frame + background + foto + stiker),
 * mengunggah otomatis ke penyimpanan (SMB NAS / Nextcloud / Fail-safe Lokal),
 * secara otomatis membuat link publik view-only dari Nextcloud + QR Code interaktif,
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
  const [shareUrl, setShareUrl] = useState(null);
  const [sessionName, setSessionName] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);
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

  // 2. Upload otomatis ke backend & minta automated Nextcloud view-only share link
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
          if (data?.sessionName) setSessionName(data.sessionName);
          if (data?.shareUrl) {
            setShareUrl(data.shareUrl);
            QRCode.toDataURL(data.shareUrl, {
              width: 240,
              margin: 2,
              color: { dark: "#1E1A16", light: "#FFFFFF" },
            })
              .then((qr) => setQrCodeDataUrl(qr))
              .catch((qrErr) => console.warn("Gagal render QR:", qrErr));
          }
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

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadFinal = () => {
    if (!finalDataUrl) return;
    const a = document.createElement("a");
    a.href = finalDataUrl;
    a.download = `${sessionName ? `${sessionName}.jpg` : `photobox-${Date.now()}-frame.jpg`}`;
    a.click();
  };

  const handleDownloadOriginals = () => {
    (allOriginalPhotos || []).forEach((photo, idx) => {
      const a = document.createElement("a");
      a.href = photo;
      a.download = `${sessionName ? `${sessionName} - Original ${idx + 1}.jpg` : `photobox-original-${idx + 1}.jpg`}`;
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
        <h2 style={styles.title}>Hasil Frame Foto Kamu</h2>
        <p style={styles.subtext}>
          Foto siap disimpan, dipindai ke ponsel, atau dicetak fisik.
        </p>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Pratinjau Frame Visual */}
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
            <span style={styles.spinner} /> Menyimpan ke NAS & Nextcloud…
          </div>
        )}

        {/* Automated Nextcloud Share Link & QR Code Box */}
        {shareUrl && (
          <div style={styles.qrCard} className="pop-badge">
            <div style={styles.qrHeader}>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <span style={styles.badgeLive}>🌐 NEXTCLOUD VIEW-ONLY</span>
                {sessionName && <span style={styles.badgeSession}>📁 {sessionName}</span>}
              </div>
              <h3 style={styles.qrTitle}>Pindai QR Code untuk Unduh di Ponsel</h3>
              <p style={styles.qrDesc}>
                Arahkan kamera HP ke QR Code di bawah untuk membuka & mengunduh foto digitalmu langsung dari Nextcloud:
              </p>
            </div>

            {qrCodeDataUrl && (
              <div style={styles.qrWrapper}>
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Nextcloud View-Only"
                  style={styles.qrImage}
                />
                <span style={styles.qrScanPrompt}>📲 Pindai dengan Kamera HP</span>
              </div>
            )}

            <div style={styles.linkRow}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                style={styles.linkInput}
                onClick={(e) => e.target.select()}
                title="Tautan publik view-only Nextcloud"
              />
              <button
                style={{
                  ...styles.btnCopy,
                  ...(copied ? styles.btnCopied : {}),
                }}
                onClick={handleCopyLink}
                className="btn-interactive"
              >
                {copied ? "✓ Tersalin!" : "📋 Salin Link"}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.btnOpen}
                className="btn-interactive"
              >
                🌐 Buka
              </a>
            </div>
          </div>
        )}

        {/* Status Berhasil Simpan */}
        {status === "success" && (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              ✓ <b>Tersimpan aman!</b>{" "}
              {storageResult?.nextcloud
                ? "Tersimpan otomatis ke Nextcloud Cloud Storage."
                : "Tersimpan aman ke penyimpanan lokal server."}
            </p>
            <div style={styles.downloadRow}>
              <button
                style={styles.btnSecondary}
                onClick={handleDownloadFinal}
                className="btn-interactive"
              >
                ⬇ Unduh File Frame (JPG)
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
            onClick={() => onDone(finalDataUrl, shareUrl, sessionName)}
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
    background: "#FFFDF8",
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
    fontWeight: "bold",
  },
  stepLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: "16px 16px 32px",
    maxWidth: 520,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(20px, 4vw, 24px)",
    margin: "0 0 2px",
  },
  subtext: {
    fontSize: 11,
    color: "#6D6457",
    margin: "0 0 12px",
  },
  previewWrap: {
    background: "#EDE7D9",
    border: "2px solid #1E1A16",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    maxHeight: "44vh",
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  previewImg: {
    maxWidth: "100%",
    maxHeight: "42vh",
    objectFit: "contain",
    borderRadius: 6,
    border: "1px solid #1E1A16",
    display: "block",
  },
  previewLoading: {
    fontSize: 12,
    color: "#8A8073",
  },
  statusBox: {
    background: "#EDE7D9",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 11,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid #1E1A16",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  qrCard: {
    background: "#FFF",
    border: "2px solid #1E1A16",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
    textAlign: "center",
  },
  qrHeader: {
    marginBottom: 10,
  },
  badgeLive: {
    display: "inline-block",
    background: "#3E7C6B",
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
    padding: "2px 8px",
    borderRadius: 10,
  },
  badgeSession: {
    display: "inline-block",
    background: "#EDE7D9",
    color: "#1E1A16",
    border: "1px solid #1E1A16",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
    padding: "2px 8px",
    borderRadius: 10,
  },
  qrTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 16,
    margin: "0 0 4px",
    color: "#1E1A16",
  },
  qrDesc: {
    fontSize: 11,
    color: "#6D6457",
    margin: 0,
    lineHeight: 1.4,
  },
  qrWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "12px 0 14px",
  },
  qrImage: {
    width: 170,
    height: 170,
    border: "2px solid #1E1A16",
    borderRadius: 8,
    padding: 6,
    background: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  scanHint: {
    fontSize: 10,
    color: "#3E7C6B",
    fontWeight: "bold",
    marginTop: 6,
  },
  linkRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  linkInput: {
    flex: 1,
    padding: "8px 10px",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    fontFamily: "inherit",
    fontSize: 11,
    background: "#F6F1E7",
    color: "#1E1A16",
    outline: "none",
  },
  btnCopy: {
    background: "#1E1A16",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnCopied: {
    background: "#3E7C6B",
  },
  btnOpen: {
    background: "#FFFDF8",
    color: "#1E1A16",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    textDecoration: "none",
    display: "inline-block",
  },
  successBox: {
    background: "#EAF3EF",
    border: "1.5px solid #3E7C6B",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14,
  },
  successText: {
    fontSize: 11,
    color: "#1E1A16",
    margin: "0 0 10px",
    lineHeight: 1.4,
  },
  failedBox: {
    background: "#FFF3EE",
    border: "1.5px solid #D8482E",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14,
  },
  failedText: {
    fontSize: 11,
    color: "#D8482E",
    margin: "0 0 10px",
    lineHeight: 1.4,
  },
  downloadRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  btnSecondary: {
    flex: 1,
    background: "#FFFDF8",
    color: "#1E1A16",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: "9px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
    textAlign: "center",
  },
  btnOutline: {
    background: "transparent",
    color: "#6D6457",
    border: "1px dashed #A89F91",
    borderRadius: 8,
    padding: "9px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  },
  ctaRow: {
    marginTop: "auto",
    paddingTop: 8,
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
    boxShadow: "0 4px 12px rgba(216,72,46,0.22)",
  },
  btnDisabled: {
    background: "#D9D2C2",
    color: "#8A8073",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};
