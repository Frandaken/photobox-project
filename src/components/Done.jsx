import React, { useEffect, useState } from "react";

/**
 * Done
 * Halaman konfirmasi akhir + opsi cetak.
 * Dilengkapi timer otomatis kembali ke idle screen saat selesai berfoto.
 */
export default function Done({ finalDataUrl, onPrint, onFinish }) {
  const [countdown, setCountdown] = useState(25);

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

  return (
    <>
      <div style={styles.wrap} className="screen-fade no-print">
        <div style={styles.check} className="pop-badge">✓</div>
        <h2 style={styles.title}>Hasil Tersimpan!</h2>
        <p style={styles.desc}>
          Terima kasih sudah berfoto 🎉<br />
          Hasil foto siap dicetak atau diunduh.
        </p>

        <button style={styles.btnPrimary} onClick={onPrint} disabled={!finalDataUrl} className="btn-interactive">
          🖨 Cetak Sekarang
        </button>
        <button style={styles.btnSecondary} onClick={onFinish} className="btn-interactive">
          Selesai — Kembali ke Awal ({countdown}d)
        </button>
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
    padding: 24,
    background: "#FFFDF8",
    fontFamily: "'Courier New', ui-monospace, monospace",
    color: "#1E1A16",
  },
  check: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#3E7C6B",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    marginBottom: 16,
    boxShadow: "0 4px 12px rgba(62,124,107,0.3)",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 24,
    margin: "0 0 8px",
  },
  desc: {
    fontSize: 12,
    color: "#8A8073",
    lineHeight: 1.6,
    marginBottom: 24,
  },
  btnPrimary: {
    width: "100%",
    maxWidth: 320,
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
    marginBottom: 10,
    boxShadow: "0 4px 12px rgba(216,72,46,0.2)",
  },
  btnSecondary: {
    width: "100%",
    maxWidth: 320,
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
