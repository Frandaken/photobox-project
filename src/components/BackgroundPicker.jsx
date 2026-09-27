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
    <div style={styles.wrap} className="screen-fade">
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack} className="btn-interactive">
          ‹ Kembali
        </button>
        <span style={styles.stepLabel}>Pilih Tema</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.headerArea}>
          <h2 style={styles.title}>Pilih Tema Visual</h2>
          <p style={styles.desc}>
            Warna dasar yang akan menjadi latar belakang hasil fotomu.
          </p>
        </div>

        {loading && <p style={styles.loading}>Memuat pilihan tema…</p>}

        <div style={styles.grid}>
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              style={styles.card}
              onClick={() => onSelect(bg)}
              className="card-interactive"
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
    maxWidth: 640,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  headerArea: {
    marginBottom: 14,
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(20px, 4vw, 24px)",
    margin: "0 0 4px",
  },
  desc: {
    fontSize: 12,
    color: "#6D6457",
    margin: 0,
    lineHeight: 1.4,
  },
  loading: {
    fontSize: 12,
    color: "#8A8073",
    padding: "20px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: 12,
  },
  card: {
    border: "2px solid #1E1A16",
    borderRadius: 12,
    background: "#fff",
    padding: 12,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  swatch: {
    width: "100%",
    aspectRatio: "4/3",
    borderRadius: 8,
    border: "1.5px solid #1E1A16",
    boxShadow: "inset 0 1px 4px rgba(0,0,0,0.1)",
  },
  cardName: {
    fontSize: 12,
    color: "#1E1A16",
  },
};
