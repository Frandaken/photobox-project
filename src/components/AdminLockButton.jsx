import React, { useState } from "react";

export default function AdminLockButton({ onUnlock }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Discreet Lock Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError("");
          setPin("");
        }}
        title="Admin Panel"
        className="fixed top-4 right-4 z-40 p-2.5 rounded-full bg-slate-900/40 hover:bg-slate-900/80 text-white/60 hover:text-white backdrop-blur transition-all border border-white/10 shadow-lg cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </button>

      {/* PIN Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>🔐</span> Masuk Admin Panel
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Masukkan PIN Admin (default: <code>1234</code>)
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN Admin"
                maxLength={10}
                className="w-full px-4 py-3 text-center text-xl tracking-widest bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 text-white"
              />

              {error && (
                <p className="text-xs text-rose-400 text-center font-medium">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !pin}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-semibold transition cursor-pointer"
                >
                  {loading ? "Memeriksa..." : "Buka"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
