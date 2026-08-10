import React, { useState } from "react";

/**
 * AdminLockButton
 * Ikon gembok kecil di pojok kanan atas layar, selalu ada di semua screen
 * (dipasang sekali di App.jsx sebagai overlay, bukan per-komponen).
 * Klik -> tampilkan modal PIN -> kalau benar, buka AdminPanel penuh.
 */
export default function AdminLockButton({ onUnlock }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setError("PIN salah");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setShowPinModal(false);
      setPin("");
      setLoading(false);
      onUnlock(data.token);
    } catch (err) {
      setError("Tidak bisa terhubung ke server");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        style={styles.lockBtn}
        onClick={() => setShowPinModal(true)}
        aria-label="Buka Admin Panel"
        title="Admin"
      >
        🔒
      </button>

      {showPinModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPinModal(false)}>
          <form
            style={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h3 style={styles.modalTitle}>Masuk sebagai Admin</h3>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="Masukkan PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={styles.pinInput}
            />
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Memeriksa…" : "Masuk"}
            </button>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => setShowPinModal(false)}
            >
              Batal
            </button>
          </form>
        </div>
      )}
    </>
  );
}

const styles = {
  lockBtn: {
    position: "fixed",
    top: 12,
    right: 12,
    zIndex: 9999,
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(30,26,22,0.35)",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    background: "#FFFDF8",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 320,
    fontFamily: "'Courier New', ui-monospace, monospace",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modalTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 16,
    margin: "0 0 6px",
    textAlign: "center",
  },
  pinInput: {
    fontFamily: "inherit",
    fontSize: 16,
    letterSpacing: 4,
    textAlign: "center",
    padding: 12,
    border: "2px solid #1E1A16",
    borderRadius: 8,
  },
  errorText: {
    color: "#D8482E",
    fontSize: 11,
    textAlign: "center",
    margin: 0,
  },
  submitBtn: {
    background: "#D8482E",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: 12,
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  cancelBtn: {
    background: "transparent",
    color: "#8A8073",
    border: "none",
    padding: 8,
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  },
};
