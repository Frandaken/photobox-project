import React, { useState, useEffect } from "react";

export default function AdminLockButton({ onUnlock }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Dukungan buka via URL hash (#admin) atau shortcut Ctrl+Shift+A / Alt+A
  useEffect(() => {
    const checkHash = () => {
      if (
        window.location.hash === "#admin" ||
        window.location.search.includes("admin=true")
      ) {
        setIsOpen(true);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);

    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") || (e.altKey && e.key.toLowerCase() === "a")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("hashchange", checkHash);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pin) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "PIN salah");
      } else {
        setIsOpen(false);
        setPin("");
        onUnlock(data.token);
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (val) => {
    setError("");
    if (val === "CLEAR") {
      setPin("");
    } else if (val === "BACKSPACE") {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (pin.length < 10) {
        setPin((prev) => prev + val);
      }
    }
  };

  return (
    <>
      {/* Floating Button Hanya Lock Icon di Pojok Kanan Atas */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError("");
          setPin("");
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Admin Panel"
        aria-label="Admin Panel"
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 99999,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isHovered ? "#2C2621" : "rgba(30, 26, 22, 0.88)",
          color: isHovered ? "#FFD56B" : "#F6F1E7",
          border: "1.5px solid #E3A63E",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
          cursor: "pointer",
          transition: "all 0.15s ease",
          outline: "none",
          padding: 0,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>

      {/* PIN Dialog Modal dengan On-Screen Numeric Keypad */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(5px)",
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: "#1E1A16",
              border: "2px solid #E3A63E",
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "340px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.85)",
              color: "#F6F1E7",
              fontFamily: "system-ui, -apple-system, sans-serif",
              boxSizing: "border-box",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#FFD56B",
                }}
              >
                <span>🔐</span> Masuk Admin Panel
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#A89F91",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Display PIN Input */}
            <div style={{ marginBottom: "16px" }}>
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setError("");
                  setPin(e.target.value);
                }}
                placeholder="PIN"
                maxLength={10}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "24px",
                  textAlign: "center",
                  letterSpacing: "8px",
                  backgroundColor: "#2C2621",
                  border: "1.5px solid #4A4036",
                  borderRadius: "12px",
                  color: "#FFFFFF",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#E3A63E")}
                onBlur={(e) => (e.target.style.borderColor = "#4A4036")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  color: "#FF7B60",
                  fontSize: "13px",
                  fontWeight: 600,
                  textAlign: "center",
                  marginBottom: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* On-Screen Numeric Keypad (Untuk Layar Sentuh Kios) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {[
                "1", "2", "3",
                "4", "5", "6",
                "7", "8", "9",
                "CLEAR", "0", "BACKSPACE"
              ].map((key) => {
                const isClear = key === "CLEAR";
                const isBackspace = key === "BACKSPACE";

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    style={{
                      height: "50px",
                      borderRadius: "10px",
                      backgroundColor: isClear
                        ? "#3A2A28"
                        : isBackspace
                        ? "#3A332C"
                        : "#2C2621",
                      border: "1px solid #4A4036",
                      color: isClear
                        ? "#FF8B7B"
                        : isBackspace
                        ? "#FFD56B"
                        : "#F6F1E7",
                      fontSize: isClear ? "12px" : isBackspace ? "18px" : "20px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.05s ease, background-color 0.1s ease",
                      userSelect: "none",
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                    onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {isClear ? "C" : isBackspace ? "⌫" : key}
                  </button>
                );
              })}
            </div>

            {/* Tombol Aksi Bawah */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  backgroundColor: "#3A332C",
                  color: "#D6CEBF",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !pin}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  backgroundColor: "#E3A63E",
                  color: "#1E1A16",
                  border: "none",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: loading || !pin ? "not-allowed" : "pointer",
                  opacity: loading || !pin ? 0.5 : 1,
                  boxShadow: "0 2px 8px rgba(227, 166, 62, 0.3)",
                }}
              >
                {loading ? "Memeriksa…" : "Buka Panel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
