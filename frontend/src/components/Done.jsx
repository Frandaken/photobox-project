import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Done
 * Halaman konfirmasi akhir + opsi cetak.
 * Menampilkan QR Code langsung untuk scan Nextcloud view-only share link.
 * Dilengkapi timer otomatis kembali ke idle screen saat selesai berfoto.
 */
export default function Done({ finalDataUrl, shareUrl, sessionName, onPrint, onFinish }) {
  const [countdown, setCountdown] = useState(30);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 180,
        margin: 2,
        color: { dark: "#1E1A16", light: "#FFFFFF" },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn("Gagal membuat QR Code di Done:", err));
    }
  }, [shareUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinish]);

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      <div style={styles.wrap} className="screen-fade no-print">
        <div style={styles.check} className="pop-badge">✓</div>
        <h2 style={styles.title}>Hasil Foto Tersimpan!</h2>
        <p style={styles.desc}>
          Terima kasih sudah berfoto di Photobox 🎉<br />
          Foto siap dicetak fisik atau disimpan ke ponselmu.
        </p>

        {/* QR Code Nextcloud */}
        {shareUrl && (
          <div style={styles.qrCard} className="pop-badge">
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={styles.qrBadge}>📱 PINDAI KE PONSEL</span>
              {sessionName && <span style={styles.sessionBadge}>📁 {sessionName}</span>}
            </div>
            <p style={styles.qrPrompt}>Arahkan kamera HP ke QR Code ini:</p>
            {qrCodeDataUrl && (
              <img
                src={qrCodeDataUrl}
                alt="QR Code Nextcloud"
                style={styles.qrImg}
              />
            )}
            <div style={styles.linkRow}>
              <button
                style={{ ...styles.copyBtn, ...(copied ? styles.copyBtnSuccess : {}) }}
                onClick={handleCopy}
                className="btn-interactive"
              >
                {copied ? "✓ Tautan Tersalin!" : "📋 Salin Tautan Nextcloud"}
              </button>
            </div>
          </div>
        )}

        <div style={styles.actionRow}>
          <button
            style={styles.btnPrimary}
            onClick={onPrint}
            disabled={!finalDataUrl}
            className="btn-interactive"
          >
            🖨 Cetak Sekarang
          </button>
          <button
            style={styles.btnSecondary}
            onClick={onFinish}
            className="btn-interactive"
          >
            Selesai — Kembali ke Awal ({countdown}d)
          </button>
        </div>
      </div>

      {/* Hanya dirender ke kertas saat print (disembunyikan di layar biasa) */}
      {finalDataUrl && (
        <img src={finalDataUrl} alt="Hasil cetak photobox" className="print-area" />
      )}
    </>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px 16px",
    background: "#FFFDF8",
    fontFamily: "'Courier New', ui-monospace, monospace",
    color: "#1E1A16",
    maxWidth: 480,
    margin: "0 auto",
    boxSizing: "border-box",
  },
  check: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#3E7C6B",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    marginBottom: 12,
    boxShadow: "0 4px 14px rgba(62,124,107,0.3)",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(20px, 4vw, 24px)",
    margin: "0 0 6px",
  },
  desc: {
    fontSize: 12,
    color: "#6D6457",
    lineHeight: 1.5,
    marginBottom: 16,
    margin: "0 0 16px",
  },
  qrCard: {
    background: "#fff",
    border: "2px solid #1E1A16",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 16,
    width: "100%",
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  qrBadge: {
    background: "#3E7C6B",
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
    padding: "2px 8px",
    borderRadius: 8,
  },
  sessionBadge: {
    background: "#EDE7D9",
    color: "#1E1A16",
    border: "1px solid #1E1A16",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
    padding: "2px 8px",
    borderRadius: 8,
  },
  qrPrompt: {
    fontSize: 11,
    color: "#6D6457",
    margin: "0 0 8px",
  },
  qrImg: {
    width: 150,
    height: 150,
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: 6,
    background: "#fff",
    marginBottom: 8,
  },
  linkRow: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  copyBtn: {
    background: "#EDE7D9",
    color: "#1E1A16",
    border: "1px solid #1E1A16",
    borderRadius: 6,
    padding: "6px 12px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  copyBtnSuccess: {
    background: "#3E7C6B",
    color: "#fff",
    borderColor: "#3E7C6B",
  },
  actionRow: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  btnPrimary: {
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
    boxShadow: "0 4px 12px rgba(216,72,46,0.2)",
  },
  btnSecondary: {
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
};
