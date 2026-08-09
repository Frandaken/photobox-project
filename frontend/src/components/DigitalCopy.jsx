import React, { useEffect, useRef, useState } from "react";
import { renderComposition, drawStickers, canvasToDataUrl } from "../utils/compositor.js";

/**
 * DigitalCopy
 * Merender hasil akhir (composite + stiker), lalu mencoba upload ke backend
 * (yang akan simpan ke NAS via SMB + generate share link Nextcloud).
 * Failsafe: kalau upload gagal, foto tetap tersedia untuk diunduh langsung
 * dari browser (tanpa link QR).
 *
 * Yang diunggah/diunduh: 1 file gabungan (frame+foto+stiker) DAN semua foto
 * original hasil sesi, sesuai permintaan "foto strip semua dan semua foto original".
 */

const UPLOAD_ENDPOINT = "/api/upload"; // disediakan backend Node/Express di NAS

export default function DigitalCopy({ layout, background, chosenPhotos, stickers, allOriginalPhotos, onDone, onBack }) {
  const canvasRef = useRef(null);
  const [finalDataUrl, setFinalDataUrl] = useState(null);
  const [status, setStatus] = useState("rendering"); // rendering | uploading | success | failed
  const [shareUrl, setShareUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Render komposisi akhir (background+foto+stiker) sekali di awal
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const canvas = canvasRef.current;
      await renderComposition(canvas, layout, background, chosenPhotos);
      await drawStickers(canvas, stickers);
      const dataUrl = canvasToDataUrl(canvas);
      if (!cancelled) {
        setFinalDataUrl(dataUrl);
        setStatus("uploading");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Setelah render selesai, coba upload ke backend
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

        if (!res.ok) throw new Error(`Server merespons status ${res.status}`);

        const data = await res.json();
        // Diharapkan backend mengembalikan { shareUrl: "https://nextcloud.../s/xxxx" }
        if (!data?.shareUrl) throw new Error("Respons server tidak berisi shareUrl");

        if (!cancelled) {
          setShareUrl(data.shareUrl);
          setStatus("success");
        }
      } catch (err) {
        console.warn("Upload ke NAS/Nextcloud gagal, failsafe ke unduh lokal:", err);
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

  const handleDownloadLocal = () => {
    if (!finalDataUrl) return;
    const a = document.createElement("a");
    a.href = finalDataUrl;
    a.download = `photobox-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack}>‹ Kembali</button>
        <span style={styles.stepLabel}>Digital Copy</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Hasil akhir kamu</h2>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={styles.previewWrap}>
          {finalDataUrl ? (
            <img src={finalDataUrl} alt="Hasil akhir" style={styles.previewImg} />
          ) : (
            <div style={styles.previewLoading}>Menyusun hasil akhir…</div>
          )}
        </div>

        {status === "uploading" && (
          <div style={styles.statusBox}>
            <span style={styles.spinner} /> Mengunggah ke penyimpanan…
          </div>
        )}

        {status === "success" && shareUrl && (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              ✓ Tersimpan! Pindai kode QR di bawah untuk mengunduh dari HP-mu.
            </p>
            <div style={styles.qrWrap}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code unduhan"
                style={styles.qrImg}
              />
            </div>
            <p style={styles.linkText}>{shareUrl}</p>
          </div>
        )}

        {status === "failed" && (
          <div style={styles.failedBox}>
            <p style={styles.failedText}>
              ⚠ Tidak bisa mengunggah ke penyimpanan jaringan saat ini
              {errorMsg ? ` (${errorMsg})` : ""}. Kamu tetap bisa mengunduh
              hasilnya langsung ke perangkat ini.
            </p>
            <button style={styles.btnSecondary} onClick={handleDownloadLocal}>
              ⬇ Unduh ke perangkat ini
            </button>
          </div>
        )}

        <div style={styles.ctaRow}>
          <button
            style={{
              ...styles.btnPrimary,
              ...(finalDataUrl ? {} : styles.btnDisabled),
            }}
            disabled={!finalDataUrl}
            onClick={onDone}
          >
            Lanjut ke Cetak
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
    maxHeight: 320,
    borderRadius: 4,
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
    width: 12,
    height: 12,
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
    textAlign: "center",
  },
  successText: {
    fontSize: 12,
    marginBottom: 10,
  },
  qrWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 8,
  },
  qrImg: {
    width: 160,
    height: 160,
  },
  linkText: {
    fontSize: 9,
    color: "#8A8073",
    wordBreak: "break-all",
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
  btnSecondary: {
    display: "block",
    width: "100%",
    background: "transparent",
    color: "#1E1A16",
    border: "2px solid #1E1A16",
    borderRadius: 10,
    padding: 12,
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
    cursor: "pointer",
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
