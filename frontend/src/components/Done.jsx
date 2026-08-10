import React from "react";

/**
 * Done
 * Halaman konfirmasi akhir + opsi cetak.
 *
 * Print hanya menampilkan gambar hasil akhir (bukan seluruh halaman ini),
 * dicapai dengan elemen <img> tersembunyi yang HANYA muncul lewat
 * @media print (lihat index.css untuk aturan print-area/no-print).
 */
export default function Done({ finalDataUrl, onPrint, onFinish }) {
  return (
    <>
      <div style={styles.wrap} className="no-print">
        <div style={styles.check}>✓</div>
        <h2 style={styles.title}>Hasil tersimpan!</h2>
        <p style={styles.desc}>
          Terima kasih sudah berfoto 🎉<br />
          Ingin mencetak hasilnya sekarang?
        </p>

        <button style={styles.btnPrimary} onClick={onPrint} disabled={!finalDataUrl}>
          🖨 Cetak Sekarang
        </button>
        <button style={styles.btnSecondary} onClick={onFinish}>
          Selesai — Kembali ke Awal
        </button>
      </div>

      {/* Hanya dirender ke kertas saat print (disembunyikan di layar biasa) */}
      {finalDataUrl && (
        <img src={finalDataUrl} alt="Hasil cetak" className="print-area" />
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
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 22,
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
