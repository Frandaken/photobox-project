import React, { useEffect, useState } from "react";

/**
 * AdminPanel
 * Ditampilkan penuh layar setelah PIN benar (lihat AdminLockButton).
 * Berisi:
 * - Status koneksi NAS (SMB)
 * - Daftar Layout (lihat, tambah, edit nama/paperHint/requiredShots, hapus)
 * - Daftar Background (lihat, tambah warna, edit nama, hapus)
 *
 * Catatan: editor Layout di versi ini berbasis FORM (bukan drag-drop visual)
 * untuk slot foto — mengedit slot lewat angka x/y/width/height. Editor
 * drag-drop visual bisa jadi peningkatan berikutnya.
 */
export default function AdminPanel({ token, onClose }) {
  const [status, setStatus] = useState(null); // { smb: 'connected'|'error', detail? }
  const [statusLoading, setStatusLoading] = useState(true);

  const [layouts, setLayouts] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saveMsg, setSaveMsg] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    async function loadAll() {
      setStatusLoading(true);
      setLoadingData(true);
      try {
        const [statusRes, layoutsRes, bgRes] = await Promise.all([
          fetch("/api/admin/status", { headers: authHeaders }),
          fetch("/api/layouts"),
          fetch("/api/backgrounds"),
        ]);
        setStatus(await statusRes.json());
        setLayouts(await layoutsRes.json());
        setBackgrounds(await bgRes.json());
      } catch (err) {
        setStatus({ smb: "error", detail: "Tidak bisa terhubung ke server" });
      }
      setStatusLoading(false);
      setLoadingData(false);
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashSaved = () => {
    setSaveMsg("Tersimpan ✓");
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const saveLayouts = async (next) => {
    setLayouts(next);
    await fetch("/api/admin/layouts", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(next),
    });
    flashSaved();
  };

  const saveBackgrounds = async (next) => {
    setBackgrounds(next);
    await fetch("/api/admin/backgrounds", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(next),
    });
    flashSaved();
  };

  // --- Layout handlers ---
  const addLayout = () => {
    const newLayout = {
      id: `layout-${Date.now()}`,
      name: "Layout Baru",
      paperHint: "4R",
      canvasWidth: 1200,
      canvasHeight: 1800,
      requiredShots: 1,
      slots: [{ x: 40, y: 40, width: 1120, height: 1720 }],
    };
    saveLayouts([...layouts, newLayout]);
  };

  const updateLayoutField = (id, field, value) => {
    setLayouts((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const commitLayoutChange = () => saveLayouts(layouts);

  const deleteLayout = (id) => {
    saveLayouts(layouts.filter((l) => l.id !== id));
  };

  const updateSlotField = (layoutId, slotIndex, field, value) => {
    setLayouts((prev) =>
      prev.map((l) => {
        if (l.id !== layoutId) return l;
        const nextSlots = l.slots.map((s, i) =>
          i === slotIndex ? { ...s, [field]: Number(value) || 0 } : s
        );
        return { ...l, slots: nextSlots };
      })
    );
  };

  const addSlot = (layoutId) => {
    setLayouts((prev) =>
      prev.map((l) => {
        if (l.id !== layoutId) return l;
        const nextSlots = [
          ...l.slots,
          { x: 40, y: 40, width: 200, height: 200 },
        ];
        return { ...l, slots: nextSlots, requiredShots: nextSlots.length };
      })
    );
  };

  const removeSlot = (layoutId, slotIndex) => {
    setLayouts((prev) =>
      prev.map((l) => {
        if (l.id !== layoutId) return l;
        const nextSlots = l.slots.filter((_, i) => i !== slotIndex);
        return { ...l, slots: nextSlots, requiredShots: nextSlots.length };
      })
    );
  };

  // --- Background handlers ---
  const addBackground = () => {
    const newBg = {
      id: `bg-${Date.now()}`,
      name: "Warna Baru",
      thumbColor: "#F6F1E7",
    };
    saveBackgrounds([...backgrounds, newBg]);
  };

  const updateBackgroundField = (id, field, value) => {
    setBackgrounds((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const commitBackgroundChange = () => saveBackgrounds(backgrounds);

  const deleteBackground = (id) => {
    saveBackgrounds(backgrounds.filter((b) => b.id !== id));
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <h1 style={styles.title}>⚙ Admin Panel</h1>
        <button style={styles.closeBtn} onClick={onClose}>
          ✕ Tutup
        </button>
      </div>

      <div style={styles.content}>
        {saveMsg && <div style={styles.saveToast}>{saveMsg}</div>}

        {/* --- Status NAS --- */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Status Penyimpanan NAS</h2>
          {statusLoading ? (
            <p style={styles.muted}>Memeriksa koneksi…</p>
          ) : status?.smb === "connected" ? (
            <p style={styles.statusOk}>✓ Terhubung ke NAS (SMB)</p>
          ) : (
            <p style={styles.statusError}>
              ⚠ Tidak terhubung{status?.detail ? `: ${status.detail}` : ""}
            </p>
          )}
        </section>

        {loadingData ? (
          <p style={styles.muted}>Memuat data…</p>
        ) : (
          <>
            {/* --- Kelola Layout --- */}
            <section style={styles.section}>
              <div style={styles.sectionHeaderRow}>
                <h2 style={styles.sectionTitle}>Layout</h2>
                <button style={styles.addBtn} onClick={addLayout}>
                  + Tambah Layout
                </button>
              </div>

              {layouts.map((layout) => (
                <div key={layout.id} style={styles.card}>
                  <div style={styles.fieldRow}>
                    <label style={styles.label}>Nama</label>
                    <input
                      style={styles.input}
                      value={layout.name}
                      onChange={(e) =>
                        updateLayoutField(layout.id, "name", e.target.value)
                      }
                      onBlur={commitLayoutChange}
                    />
                  </div>
                  <div style={styles.fieldRowInline}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Ukuran kertas</label>
                      <input
                        style={styles.input}
                        value={layout.paperHint}
                        onChange={(e) =>
                          updateLayoutField(layout.id, "paperHint", e.target.value)
                        }
                        onBlur={commitLayoutChange}
                      />
                    </div>
                    <div style={{ width: 90 }}>
                      <label style={styles.label}>Canvas W</label>
                      <input
                        type="number"
                        style={styles.input}
                        value={layout.canvasWidth}
                        onChange={(e) =>
                          updateLayoutField(layout.id, "canvasWidth", Number(e.target.value))
                        }
                        onBlur={commitLayoutChange}
                      />
                    </div>
                    <div style={{ width: 90 }}>
                      <label style={styles.label}>Canvas H</label>
                      <input
                        type="number"
                        style={styles.input}
                        value={layout.canvasHeight}
                        onChange={(e) =>
                          updateLayoutField(layout.id, "canvasHeight", Number(e.target.value))
                        }
                        onBlur={commitLayoutChange}
                      />
                    </div>
                  </div>

                  <p style={styles.slotsLabel}>
                    Slot foto ({layout.slots.length}) — urutan menentukan urutan pengisian
                  </p>
                  {layout.slots.map((slot, i) => (
                    <div key={i} style={styles.slotRow}>
                      <span style={styles.slotIndex}>{i + 1}</span>
                      {["x", "y", "width", "height"].map((field) => (
                        <input
                          key={field}
                          type="number"
                          style={styles.slotInput}
                          placeholder={field}
                          value={slot[field]}
                          onChange={(e) =>
                            updateSlotField(layout.id, i, field, e.target.value)
                          }
                          onBlur={commitLayoutChange}
                        />
                      ))}
                      <button
                        style={styles.slotDeleteBtn}
                        onClick={() => removeSlot(layout.id, i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    style={styles.smallAddBtn}
                    onClick={() => addSlot(layout.id)}
                  >
                    + Tambah slot
                  </button>

                  <button
                    style={styles.deleteBtn}
                    onClick={() => deleteLayout(layout.id)}
                  >
                    🗑 Hapus layout ini
                  </button>
                </div>
              ))}
            </section>

            {/* --- Kelola Background --- */}
            <section style={styles.section}>
              <div style={styles.sectionHeaderRow}>
                <h2 style={styles.sectionTitle}>Background</h2>
                <button style={styles.addBtn} onClick={addBackground}>
                  + Tambah Background
                </button>
              </div>

              {backgrounds.map((bg) => (
                <div key={bg.id} style={styles.card}>
                  <div style={styles.fieldRowInline}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Nama</label>
                      <input
                        style={styles.input}
                        value={bg.name}
                        onChange={(e) =>
                          updateBackgroundField(bg.id, "name", e.target.value)
                        }
                        onBlur={commitBackgroundChange}
                      />
                    </div>
                    <div style={{ width: 70 }}>
                      <label style={styles.label}>Warna</label>
                      <input
                        type="color"
                        style={styles.colorInput}
                        value={bg.thumbColor}
                        onChange={(e) =>
                          updateBackgroundField(bg.id, "thumbColor", e.target.value)
                        }
                        onBlur={commitBackgroundChange}
                      />
                    </div>
                  </div>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => deleteBackground(bg.id)}
                  >
                    🗑 Hapus background ini
                  </button>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    inset: 0,
    zIndex: 9998,
    background: "#FFFDF8",
    fontFamily: "'Courier New', ui-monospace, monospace",
    color: "#1E1A16",
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "2px solid #1E1A16",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 18,
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "2px solid #1E1A16",
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    maxWidth: 560,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  saveToast: {
    position: "fixed",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#3E7C6B",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    zIndex: 10001,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 15,
    margin: "0 0 10px",
  },
  muted: {
    fontSize: 12,
    color: "#8A8073",
  },
  statusOk: {
    fontSize: 12,
    color: "#3E7C6B",
    fontWeight: "bold",
  },
  statusError: {
    fontSize: 12,
    color: "#D8482E",
    fontWeight: "bold",
  },
  addBtn: {
    background: "#D8482E",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
  },
  card: {
    border: "1.5px solid #1E1A16",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    background: "#fff",
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldRowInline: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    display: "block",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#8A8073",
    marginBottom: 3,
  },
  input: {
    width: "100%",
    fontFamily: "inherit",
    fontSize: 12,
    padding: 7,
    border: "1.5px solid #1E1A16",
    borderRadius: 6,
    boxSizing: "border-box",
  },
  colorInput: {
    width: "100%",
    height: 32,
    padding: 2,
    border: "1.5px solid #1E1A16",
    borderRadius: 6,
    cursor: "pointer",
  },
  slotsLabel: {
    fontSize: 10,
    color: "#8A8073",
    margin: "8px 0 6px",
  },
  slotRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginBottom: 6,
  },
  slotIndex: {
    width: 18,
    fontSize: 10,
    color: "#8A8073",
    flexShrink: 0,
  },
  slotInput: {
    width: 0,
    flex: 1,
    fontFamily: "inherit",
    fontSize: 11,
    padding: 6,
    border: "1px solid #1E1A16",
    borderRadius: 5,
  },
  slotDeleteBtn: {
    background: "transparent",
    border: "none",
    color: "#D8482E",
    cursor: "pointer",
    fontSize: 13,
    flexShrink: 0,
  },
  smallAddBtn: {
    background: "transparent",
    border: "1.5px dashed #8A8073",
    color: "#8A8073",
    borderRadius: 6,
    padding: 6,
    fontFamily: "inherit",
    fontSize: 10,
    cursor: "pointer",
    width: "100%",
    marginBottom: 8,
  },
  deleteBtn: {
    background: "transparent",
    border: "1.5px dashed #D8482E",
    color: "#D8482E",
    borderRadius: 8,
    padding: 8,
    fontFamily: "inherit",
    fontSize: 10,
    cursor: "pointer",
    width: "100%",
    marginTop: 4,
  },
};
