import React from "react";

export default function IdleScreen({ onStart }) {
  return (
    <div style={styles.idle} onClick={onStart} className="screen-fade">
      <div style={styles.brand}>✦ PHOTOBOX STUDIO ✦</div>

      {/* Floating Animated Polaroid Stack */}
      <div style={styles.stack}>
        <div style={styles.polaroid1} className="polaroid-1">
          <div style={styles.photoInner1}>
            <span style={{ fontSize: 28 }}>🌸</span>
          </div>
          <div style={styles.captionLine} />
        </div>

        <div style={styles.polaroid2} className="polaroid-2">
          <div style={styles.photoInner2}>
            <span style={{ fontSize: 28 }}>✌️</span>
          </div>
          <div style={styles.captionLine} />
        </div>

        <div style={styles.polaroid3} className="polaroid-3">
          <div style={styles.photoInner3}>
            <span style={{ fontSize: 32 }}>✨</span>
          </div>
          <div style={{ ...styles.captionLine, width: "60%" }} />
        </div>
      </div>

      <div style={styles.textBlock}>
        <p style={styles.tap}>
          Sentuh Layar
          <br />
          untuk <span style={styles.highlightText} className="tap-glow">Mulai Foto</span>
        </p>
        <p style={styles.hint}>📸 Tanpa batas waktu · Pilih frame favoritmu</p>
      </div>

      <div style={styles.bottomPrompt}>
        <span style={styles.pulseDot} />
        <span style={styles.readyText}>SIAP UNTUK BERFOTO</span>
      </div>
    </div>
  );
}

const styles = {
  idle: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 20%, rgba(216,72,46,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(62,124,107,0.22), transparent 55%), #1E1A16",
    color: "#F6F1E7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "24px 20px",
    cursor: "pointer",
    fontFamily: "'Courier New', ui-monospace, monospace",
    position: "relative",
    overflow: "hidden",
  },
  brand: {
    fontFamily: "Georgia, serif",
    fontSize: 16,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#E3A63E",
    position: "absolute",
    top: 28,
  },
  stack: {
    position: "relative",
    width: 200,
    height: 230,
    margin: "20px 0 28px",
  },
  polaroid1: {
    position: "absolute",
    width: 140,
    height: 175,
    background: "#fff",
    borderRadius: 4,
    boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
    left: 0,
    top: 15,
    padding: "10px 10px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  photoInner1: {
    width: "100%",
    height: 120,
    background: "#FFB3BA",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  polaroid2: {
    position: "absolute",
    width: 140,
    height: 175,
    background: "#fff",
    borderRadius: 4,
    boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
    left: 35,
    top: 0,
    padding: "10px 10px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  photoInner2: {
    width: "100%",
    height: 120,
    background: "#BAE1FF",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  polaroid3: {
    position: "absolute",
    width: 140,
    height: 175,
    background: "#fff",
    borderRadius: 4,
    boxShadow: "0 16px 36px rgba(0,0,0,0.6)",
    left: 20,
    top: 30,
    padding: "10px 10px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  photoInner3: {
    width: "100%",
    height: 120,
    background: "#D8482E",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  captionLine: {
    width: "75%",
    height: 3,
    background: "#D9D2C2",
    borderRadius: 2,
    marginTop: 8,
  },
  textBlock: {
    zIndex: 2,
  },
  tap: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(24px, 5vw, 34px)",
    lineHeight: 1.25,
    margin: "0 0 10px",
  },
  highlightText: {
    color: "#E3A63E",
    display: "inline-block",
  },
  hint: {
    fontSize: 13,
    color: "#C9C2B4",
    margin: 0,
  },
  bottomPrompt: {
    position: "absolute",
    bottom: 28,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    background: "#3E7C6B",
    borderRadius: "50%",
    boxShadow: "0 0 10px #3E7C6B",
  },
  readyText: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#A89F91",
    fontWeight: "bold",
  },
};
