import React from "react";
import { LAYOUTS } from "../data/layouts.js";

export default function LayoutPicker({ onSelect, onBack }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack}>‹ Kembali</button>
        <span style={styles.stepLabel}>Pilih Layout</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Pilih struktur frame</h2>
        <p style={styles.desc}>
          Tentukan jumlah dan susunan foto dalam hasil akhirmu.
        </p>

        <div style={styles.grid}>
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              style={styles.card}
              onClick={() => onSelect(layout)}
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
                      opacity: 0.5,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
              <b style={styles.cardName}>{layout.name}</b>
              <small style={styles.cardHint}>
                {layout.paperHint} · {layout.requiredShots} foto
              </small>
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
  preview: {
    position: "relative",
    width: "100%",
    maxHeight: 120,
    background: "#EDE7D9",
    border: "1px solid #1E1A16",
  },
  cardName: {
    fontSize: 12,
  },
  cardHint: {
    fontSize: 9,
    color: "#8A8073",
    textAlign: "center",
  },
};
