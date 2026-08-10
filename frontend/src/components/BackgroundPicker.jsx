import React, { useEffect, useState } from "react";

export default function BackgroundPicker({ onSelect, onBack }) {
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backgrounds")
      .then((res) => res.json())
      .then((data) => setBackgrounds(data))
      .catch(() => setBackgrounds([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack}>‹ Kembali</button>
        <span style={styles.stepLabel}>Pilih Background</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Pilih tema visual</h2>
        <p style={styles.desc}>
          Warna dan corak dasar yang jadi latar hasil fotomu.
        </p>

        {loading && <p style={styles.desc}>Memuat pilihan background…</p>}

        <div style={styles.grid}>
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              style={styles.card}
              onClick={() => onSelect(bg)}
            >
              <div
                style={{
                  ...styles.swatch,
                  background: bg.imageUrl
                    ? `url(${bg.imageUrl}) center/cover`
                    : bg.thumbColor,
                }}
              />
              <b style={styles.cardName}>{bg.name}</b>
            </button>
          ))}
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
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 20,
    margin: "0 0 4px",
  },
  desc: {
    fontSize: 11,
    color: "#8A8073",
    margin: "0 0 16px",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  card: {
    border: "2px solid #1E1A16",
    borderRadius: 10,
    background: "#fff",
    padding: 10,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
  },
  swatch: {
    width: "100%",
    aspectRatio: "4/3",
    borderRadius: 6,
    border: "1px solid #1E1A16",
  },
  cardName: {
    fontSize: 12,
  },
};
