import React, { useEffect, useState } from "react";

export default function LayoutPicker({ onSelect, onBack }) {
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/layouts")
      .then((res) => res.json())
      .then((data) => setLayouts(data))
      .catch(() => setLayouts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.wrap} className="screen-fade">
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack} className="btn-interactive">
          ‹ Kembali
        </button>
        <span style={styles.stepLabel}>Pilih Frame</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.headerArea}>
          <h2 style={styles.title}>Pilih Struktur Frame</h2>
          <p style={styles.desc}>
            Tentukan jumlah dan susunan foto dalam hasil akhir cetakanmu.
          </p>
        </div>

        {loading && <p style={styles.loading}>Memuat pilihan frame…</p>}

        <div style={styles.grid}>
          {layouts.map((layout) => (
            <button
              key={layout.id}
              style={styles.card}
              onClick={() => onSelect(layout)}
              className="card-interactive"
            >
              <div
                style={{
                  ...styles.preview,
                  aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
                }}
              >
                {layout.slots.map((slot, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${(slot.x / layout.canvasWidth) * 100}%`,
                      top: `${(slot.y / layout.canvasHeight) * 100}%`,
                      width: `${(slot.width / layout.canvasWidth) * 100}%`,
                      height: `${(slot.height / layout.canvasHeight) * 100}%`,
                      background: "#3E7C6B",
                      opacity: 0.45,
                      borderRadius: 2,
                    }}
                  />
                ))}
                {layout.frameOverlayUrl && (
                  <img
                    src={layout.frameOverlayUrl}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
              <b style={styles.cardName}>{layout.name}</b>
              <span style={styles.cardBadge}>
                {layout.paperHint} · {layout.requiredShots} foto
              </span>
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
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
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
  preview: {
    position: "relative",
    width: "100%",
    maxHeight: 140,
    background: "#EDE7D9",
    border: "1.5px solid #1E1A16",
    borderRadius: 6,
    overflow: "hidden",
  },
  cardName: {
    fontSize: 12,
    color: "#1E1A16",
  },
  cardBadge: {
    fontSize: 10,
    color: "#3E7C6B",
    fontWeight: "bold",
    background: "#EAF3EF",
    padding: "2px 6px",
    borderRadius: 8,
  },
};
