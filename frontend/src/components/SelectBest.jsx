import React, { useState } from "react";

/**
 * SelectBest
 * User memilih foto dari hasil sesi (allPhotos), dibatasi tepat sejumlah
 * requiredShots. Urutan pemilihan menentukan urutan pengisian slot layout.
 */
export default function SelectBest({ allPhotos, requiredShots, onConfirm, onBack, onTakeMore }) {
  const [selectedIndices, setSelectedIndices] = useState([]); // urutan = urutan slot

  const toggle = (index) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= requiredShots) return prev; // sudah penuh, abaikan
      return [...prev, index];
    });
  };

  const isDone = selectedIndices.length === requiredShots;

  const handleConfirm = () => {
    const chosenPhotos = selectedIndices.map((i) => allPhotos[i]);
    onConfirm(chosenPhotos);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack}>‹ Kembali</button>
        <span style={styles.stepLabel}>Pilih Terbaik</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Pilih foto terbaikmu</h2>
        <div style={styles.note}>
          Frame kamu butuh <b>{requiredShots} foto</b>. Sudah dipilih:{" "}
          <b>{selectedIndices.length} / {requiredShots}</b>
        </div>

        <div style={styles.grid}>
          {allPhotos.map((src, i) => {
            const order = selectedIndices.indexOf(i);
            const chosen = order !== -1;
            return (
              <div
                key={i}
                style={{
                  ...styles.item,
                  border: chosen ? "3px solid #D8482E" : "2px solid #1E1A16",
                }}
                onClick={() => toggle(i)}
              >
                <img src={src} alt={`Foto ${i + 1}`} style={styles.img} />
                {chosen && (
                  <span style={styles.orderBadge}>{order + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.ctaRow}>
          <button
            style={{ ...styles.btnPrimary, ...(isDone ? {} : styles.btnDisabled) }}
            disabled={!isDone}
            onClick={handleConfirm}
          >
            Lanjut ke Overlay Stiker
          </button>
          <button style={styles.btnSecondary} onClick={onTakeMore}>
            Ambil foto tambahan
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
    margin: "0 0 4px",
  },
  note: {
    background: "#FFF3EE",
    border: "1.5px solid #D8482E",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 11,
    marginBottom: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 14,
  },
  item: {
    position: "relative",
    aspectRatio: "1/1",
    borderRadius: 8,
    cursor: "pointer",
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  orderBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    background: "#D8482E",
    color: "#fff",
    borderRadius: "50%",
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  ctaRow: {
    marginTop: "auto",
    paddingTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
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
  btnSecondary: {
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
  btnDisabled: {
    background: "#D9D2C2",
    cursor: "not-allowed",
  },
};
