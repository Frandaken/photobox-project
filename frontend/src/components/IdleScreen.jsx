import React from "react";

export default function IdleScreen({ onStart }) {
  return (
    <div style={styles.idle} onClick={onStart}>
      <div style={styles.brand}>✦ Photobox ✦</div>
      <div style={styles.stack}>
        <div style={{ ...styles.polaroid, transform: "rotate(-9deg)", left: 0, top: 10 }} />
        <div style={{ ...styles.polaroid, transform: "rotate(4deg)", left: 24, top: 0 }} />
        <div
          style={{
            ...styles.polaroid,
            transform: "rotate(-2deg)",
            left: 14,
            top: 24,
            background: "#D8482E",
          }}
        />
      </div>
      <p style={styles.tap}>
        Sentuh layar
        <br />
        untuk <span style={{ color: "#D8482E" }}>mulai foto</span>
      </p>
      <p style={styles.hint}>Ambil momen terbaikmu hari ini</p>
    </div>
  );
}

const styles = {
  idle: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 30% 20%, rgba(216,72,46,0.15), transparent 55%), radial-gradient(circle at 70% 80%, rgba(62,124,107,0.18), transparent 55%), #1E1A16",
    color: "#F6F1E7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 20,
    cursor: "pointer",
    fontFamily: "'Courier New', ui-monospace, monospace",
  },
  brand: {
    fontFamily: "Georgia, serif",
    fontSize: 16,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#E3A63E",
    position: "absolute",
    top: 32,
  },
  stack: {
    position: "relative",
    width: 150,
    height: 190,
    margin: "10px 0 28px",
  },
  polaroid: {
    position: "absolute",
    width: 120,
    height: 150,
    background: "#fff",
    borderRadius: 2,
    boxShadow: "0 8px 18px rgba(0,0,0,0.4)",
  },
  tap: {
    fontFamily: "Georgia, serif",
    fontSize: 28,
    lineHeight: 1.2,
    margin: "0 0 10px",
  },
  hint: {
    fontSize: 13,
    color: "#C9C2B4",
  },
};
