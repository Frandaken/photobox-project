import React, { useEffect, useState, useRef } from "react";
import { renderComposition } from "../utils/compositor.js";

/**
 * AdminPanel
 * Panel kelola lengkap:
 * 1. Status Penyimpanan (NAS SMB, Nextcloud WebDAV, Local Disk) + Uji Koneksi
 * 2. Kelola Frame & Layout:
 *    - Upload template gambar frame (PNG dengan transparansi / JPG)
 *    - Pengaturan dimensi & preset kertas (2x6 Strip, 4R, 3R)
 *    - Penataan layer foto (Foto Pertama, Foto Kedua, Foto Ketiga, dst.)
 *    - Live canvas preview dari struktur frame
 * 3. Kelola Background tema
 */
export default function AdminPanel({ token, onClose }) {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [layouts, setLayouts] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saveMsg, setSaveMsg] = useState(null);

  // Tab aktif di dalam admin panel: 'layouts', 'storage', 'backgrounds'
  const [activeTab, setActiveTab] = useState("layouts");
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/admin/status", { headers: authHeaders });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ error: "Gagal terhubung ke backend" });
    } finally {
      setStatusLoading(false);
    }
  };

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [layoutsRes, bgRes] = await Promise.all([
        fetch("/api/layouts"),
        fetch("/api/backgrounds"),
      ]);
      const layoutsData = await layoutsRes.json();
      const bgData = await bgRes.json();
      setLayouts(layoutsData);
      setBackgrounds(bgData);
      if (layoutsData.length > 0 && !selectedLayoutId) {
        setSelectedLayoutId(layoutsData[0].id);
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashSaved = (msg = "Tersimpan ✓") => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const saveLayouts = async (next) => {
    setLayouts(next);
    try {
      await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(next),
      });
      flashSaved();
    } catch {
      flashSaved("Gagal menyimpan ke server");
    }
  };

  const saveBackgrounds = async (next) => {
    setBackgrounds(next);
    try {
      await fetch("/api/admin/backgrounds", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(next),
      });
      flashSaved();
    } catch {
      flashSaved("Gagal menyimpan ke server");
    }
  };

  // --- Handlers Layout ---
  const activeLayout = layouts.find((l) => l.id === selectedLayoutId) || layouts[0];

  const addLayout = () => {
    const newId = `frame-${Date.now()}`;
    const newLayout = {
      id: newId,
      name: "Frame Baru",
      paperHint: "4R",
      canvasWidth: 1200,
      canvasHeight: 1800,
      requiredShots: 3,
      frameOverlayUrl: null,
      slots: [
        { label: "Foto Pertama", x: 80, y: 80, width: 1040, height: 480 },
        { label: "Foto Kedua", x: 80, y: 620, width: 1040, height: 480 },
        { label: "Foto Ketiga", x: 80, y: 1160, width: 1040, height: 480 },
      ],
    };
    const next = [...layouts, newLayout];
    setSelectedLayoutId(newId);
    saveLayouts(next);
  };

  const updateActiveLayoutField = (field, value) => {
    if (!activeLayout) return;
    const next = layouts.map((l) =>
      l.id === activeLayout.id ? { ...l, [field]: value } : l
    );
    setLayouts(next);
  };

  const commitActiveLayout = () => {
    saveLayouts(layouts);
  };

  const deleteActiveLayout = () => {
    if (layouts.length <= 1) {
      alert("Minimal harus ada satu frame.");
      return;
    }
    const next = layouts.filter((l) => l.id !== activeLayout.id);
    setSelectedLayoutId(next[0].id);
    saveLayouts(next);
  };

  // Upload gambar frame overlay (PNG/JPG)
  const handleUploadFrameOverlay = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      const next = layouts.map((l) =>
        l.id === activeLayout.id ? { ...l, frameOverlayUrl: dataUrl } : l
      );
      saveLayouts(next);
      flashSaved("Template frame berhasil diunggah ✓");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFrameOverlay = () => {
    const next = layouts.map((l) =>
      l.id === activeLayout.id ? { ...l, frameOverlayUrl: null } : l
    );
    saveLayouts(next);
  };

  // Preset ukuran kertas
  const applyPaperPreset = (presetKey) => {
    if (!activeLayout) return;
    let w = activeLayout.canvasWidth;
    let h = activeLayout.canvasHeight;
    let paperHint = activeLayout.paperHint;

    if (presetKey === "strip-2x6") {
      w = 600;
      h = 1800;
      paperHint = "2x6 Strip";
    } else if (presetKey === "4r-portrait") {
      w = 1200;
      h = 1800;
      paperHint = "4R Portrait";
    } else if (presetKey === "4r-landscape") {
      w = 1800;
      h = 1200;
      paperHint = "4R Landscape";
    } else if (presetKey === "3r-portrait") {
      w = 900;
      h = 1200;
      paperHint = "3R Portrait";
    } else if (presetKey === "square") {
      w = 1200;
      h = 1200;
      paperHint = "Square 1:1";
    }

    const next = layouts.map((l) =>
      l.id === activeLayout.id
        ? { ...l, canvasWidth: w, canvasHeight: h, paperHint }
        : l
    );
    saveLayouts(next);
  };

  // Slot Management
  const addSlot = () => {
    if (!activeLayout) return;
    const currentSlots = activeLayout.slots || [];
    const slotIdx = currentSlots.length;
    const slotNames = ["Foto Pertama", "Foto Kedua", "Foto Ketiga", "Foto Keempat", "Foto Kelima", "Foto Keenam"];
    const label = slotNames[slotIdx] || `Foto Ke-${slotIdx + 1}`;

    const newSlot = {
      label,
      x: 60,
      y: 60 + (slotIdx * 200) % (activeLayout.canvasHeight - 260),
      width: Math.min(300, activeLayout.canvasWidth - 120),
      height: Math.min(300, activeLayout.canvasHeight - 120),
    };

    const nextSlots = [...currentSlots, newSlot];
    const next = layouts.map((l) =>
      l.id === activeLayout.id
        ? { ...l, slots: nextSlots, requiredShots: nextSlots.length }
        : l
    );
    saveLayouts(next);
  };

  const removeSlot = (slotIndex) => {
    if (!activeLayout) return;
    const nextSlots = activeLayout.slots.filter((_, i) => i !== slotIndex);
    const next = layouts.map((l) =>
      l.id === activeLayout.id
        ? { ...l, slots: nextSlots, requiredShots: nextSlots.length }
        : l
    );
    saveLayouts(next);
  };

  const updateSlot = (slotIndex, field, value) => {
    if (!activeLayout) return;
    const num = field === "label" ? value : Number(value) || 0;
    const nextSlots = activeLayout.slots.map((s, i) =>
      i === slotIndex ? { ...s, [field]: num } : s
    );
    const next = layouts.map((l) =>
      l.id === activeLayout.id ? { ...l, slots: nextSlots } : l
    );
    setLayouts(next);
  };

  const moveSlotLayer = (fromIndex, toIndex) => {
    if (!activeLayout) return;
    const slots = [...activeLayout.slots];
    if (toIndex < 0 || toIndex >= slots.length) return;
    const [moved] = slots.splice(fromIndex, 1);
    slots.splice(toIndex, 0, moved);

    const next = layouts.map((l) =>
      l.id === activeLayout.id ? { ...l, slots } : l
    );
    saveLayouts(next);
  };

  return (
    <div style={styles.wrap}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <div style={styles.topbarLeft}>
          <span style={styles.logoIcon}>⚙</span>
          <h1 style={styles.title}>Photobox Admin</h1>
        </div>
        <button style={styles.closeBtn} onClick={onClose}>
          ✕ Tutup
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabsRow}>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === "layouts" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("layouts")}
        >
          🖼 Kelola Frame & Layout ({layouts.length})
        </button>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === "storage" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("storage")}
        >
          ☁ Status Penyimpanan & NAS
        </button>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === "backgrounds" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("backgrounds")}
        >
          🎨 Background ({backgrounds.length})
        </button>
      </div>

      {saveMsg && <div style={styles.saveToast}>{saveMsg}</div>}

      <div style={styles.content}>
        {loadingData ? (
          <p style={styles.muted}>Memuat konfigurasi…</p>
        ) : (
          <>
            {/* ==================================================== */}
            {/* TAB 1: KELOLA FRAME & LAYOUT                         */}
            {/* ==================================================== */}
            {activeTab === "layouts" && (
              <div style={styles.layoutManagerWrap}>
                {/* Selector Frame */}
                <div style={styles.frameSelectorBar}>
                  <div style={styles.frameChips}>
                    {layouts.map((l) => (
                      <button
                        key={l.id}
                        style={{
                          ...styles.frameChip,
                          ...(l.id === activeLayout?.id
                            ? styles.frameChipActive
                            : {}),
                        }}
                        onClick={() => setSelectedLayoutId(l.id)}
                      >
                        {l.name} ({l.slots?.length || 0} Foto)
                      </button>
                    ))}
                  </div>
                  <button style={styles.addFrameBtn} onClick={addLayout}>
                    + Buat Frame Baru
                  </button>
                </div>

                {activeLayout && (
                  <div style={styles.layoutEditorGrid}>
                    {/* Kolom Kiri: Visual Canvas Preview */}
                    <div style={styles.previewColumn}>
                      <h3 style={styles.subHeading}>Pratinjau Visual Frame</h3>
                      <LayoutCanvasPreview layout={activeLayout} />

                      <div style={styles.frameUploadBox}>
                        <h4 style={styles.boxTitle}>Template Gambar Frame (PNG/JPG)</h4>
                        <p style={styles.hintText}>
                          Unggah frame transparan (mis. PNG dengan bingkai & logo).
                          Gambar ini akan ditaruh di atas foto-foto.
                        </p>
                        {activeLayout.frameOverlayUrl ? (
                          <div style={styles.frameOverlayPreview}>
                            <img
                              src={activeLayout.frameOverlayUrl}
                              alt="Overlay Frame"
                              style={styles.overlayThumb}
                            />
                            <button
                              style={styles.deleteOverlayBtn}
                              onClick={handleRemoveFrameOverlay}
                            >
                              🗑 Hapus Template Gambar
                            </button>
                          </div>
                        ) : (
                          <label style={styles.uploadBtnLabel}>
                            📁 Pilih File Frame PNG/JPG
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              style={{ display: "none" }}
                              onChange={handleUploadFrameOverlay}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Kolom Kanan: Pengaturan Ukuran & Penataan Slot Foto */}
                    <div style={styles.settingsColumn}>
                      <div style={styles.sectionCard}>
                        <h3 style={styles.subHeading}>Informasi Frame</h3>
                        <div style={styles.fieldRow}>
                          <label style={styles.label}>Nama Frame</label>
                          <input
                            style={styles.input}
                            value={activeLayout.name}
                            onChange={(e) =>
                              updateActiveLayoutField("name", e.target.value)
                            }
                            onBlur={commitActiveLayout}
                          />
                        </div>

                        <div style={styles.fieldRow}>
                          <label style={styles.label}>Preset Kertas</label>
                          <div style={styles.presetButtons}>
                            <button
                              style={styles.presetBtn}
                              onClick={() => applyPaperPreset("strip-2x6")}
                            >
                              Strip 2x6 (600x1800)
                            </button>
                            <button
                              style={styles.presetBtn}
                              onClick={() => applyPaperPreset("4r-portrait")}
                            >
                              4R Tegak (1200x1800)
                            </button>
                            <button
                              style={styles.presetBtn}
                              onClick={() => applyPaperPreset("4r-landscape")}
                            >
                              4R Lebar (1800x1200)
                            </button>
                            <button
                              style={styles.presetBtn}
                              onClick={() => applyPaperPreset("3r-portrait")}
                            >
                              3R (900x1200)
                            </button>
                          </div>
                        </div>

                        <div style={styles.inlineInputs}>
                          <div style={{ flex: 1 }}>
                            <label style={styles.label}>Label Kertas</label>
                            <input
                              style={styles.input}
                              value={activeLayout.paperHint || ""}
                              onChange={(e) =>
                                updateActiveLayoutField("paperHint", e.target.value)
                              }
                              onBlur={commitActiveLayout}
                            />
                          </div>
                          <div style={{ width: 110 }}>
                            <label style={styles.label}>Lebar (px)</label>
                            <input
                              type="number"
                              style={styles.input}
                              value={activeLayout.canvasWidth}
                              onChange={(e) =>
                                updateActiveLayoutField(
                                  "canvasWidth",
                                  Number(e.target.value)
                                )
                              }
                              onBlur={commitActiveLayout}
                            />
                          </div>
                          <div style={{ width: 110 }}>
                            <label style={styles.label}>Tinggi (px)</label>
                            <input
                              type="number"
                              style={styles.input}
                              value={activeLayout.canvasHeight}
                              onChange={(e) =>
                                updateActiveLayoutField(
                                  "canvasHeight",
                                  Number(e.target.value)
                                )
                              }
                              onBlur={commitActiveLayout}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Urutan Layer Foto */}
                      <div style={styles.sectionCard}>
                        <div style={styles.cardHeaderRow}>
                          <div>
                            <h3 style={styles.subHeading}>
                              Layer Foto ({activeLayout.slots?.length || 0})
                            </h3>
                            <span style={styles.hintText}>
                              Urutan menentukan Foto Pertama, Kedua, Ketiga yang dipilih user.
                            </span>
                          </div>
                          <button style={styles.smallAddBtn} onClick={addSlot}>
                            + Tambah Slot Foto
                          </button>
                        </div>

                        <div style={styles.slotsList}>
                          {(activeLayout.slots || []).map((slot, i) => (
                            <div key={i} style={styles.slotCard}>
                              <div style={styles.slotCardHeader}>
                                <div style={styles.slotOrderBadge}>
                                  Layer #{i + 1}
                                </div>
                                <input
                                  style={styles.slotLabelInput}
                                  value={slot.label || `Foto ${i + 1}`}
                                  placeholder={`Nama slot (misal: Foto ${i + 1})`}
                                  onChange={(e) =>
                                    updateSlot(i, "label", e.target.value)
                                  }
                                  onBlur={commitActiveLayout}
                                />
                                <div style={styles.layerOrderBtns}>
                                  <button
                                    style={styles.orderArrowBtn}
                                    disabled={i === 0}
                                    onClick={() => moveSlotLayer(i, i - 1)}
                                    title="Pindah urutan naik"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    style={styles.orderArrowBtn}
                                    disabled={i === activeLayout.slots.length - 1}
                                    onClick={() => moveSlotLayer(i, i + 1)}
                                    title="Pindah urutan turun"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    style={styles.slotDeleteBtn}
                                    onClick={() => removeSlot(i)}
                                    title="Hapus slot ini"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              <div style={styles.slotCoordinatesRow}>
                                <div style={styles.coordField}>
                                  <span style={styles.coordLabel}>X:</span>
                                  <input
                                    type="number"
                                    style={styles.coordInput}
                                    value={slot.x}
                                    onChange={(e) =>
                                      updateSlot(i, "x", e.target.value)
                                    }
                                    onBlur={commitActiveLayout}
                                  />
                                </div>
                                <div style={styles.coordField}>
                                  <span style={styles.coordLabel}>Y:</span>
                                  <input
                                    type="number"
                                    style={styles.coordInput}
                                    value={slot.y}
                                    onChange={(e) =>
                                      updateSlot(i, "y", e.target.value)
                                    }
                                    onBlur={commitActiveLayout}
                                  />
                                </div>
                                <div style={styles.coordField}>
                                  <span style={styles.coordLabel}>W:</span>
                                  <input
                                    type="number"
                                    style={styles.coordInput}
                                    value={slot.width}
                                    onChange={(e) =>
                                      updateSlot(i, "width", e.target.value)
                                    }
                                    onBlur={commitActiveLayout}
                                  />
                                </div>
                                <div style={styles.coordField}>
                                  <span style={styles.coordLabel}>H:</span>
                                  <input
                                    type="number"
                                    style={styles.coordInput}
                                    value={slot.height}
                                    onChange={(e) =>
                                      updateSlot(i, "height", e.target.value)
                                    }
                                    onBlur={commitActiveLayout}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          style={styles.deleteLayoutBtn}
                          onClick={deleteActiveLayout}
                        >
                          🗑 Hapus Frame Ini
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 2: STATUS PENYIMPANAN (SMB NAS & CLOUD)         */}
            {/* ==================================================== */}
            {activeTab === "storage" && (
              <div style={styles.storageTabWrap}>
                <div style={styles.sectionHeaderRow}>
                  <h2 style={styles.sectionTitle}>
                    Status Penyimpanan & Pengunggahan Foto
                  </h2>
                  <button
                    style={styles.refreshBtn}
                    onClick={loadStatus}
                    disabled={statusLoading}
                  >
                    {statusLoading ? "Memeriksa…" : "🔄 Uji Ulang Koneksi"}
                  </button>
                </div>

                <div style={styles.storageCardsGrid}>
                  {/* SMB NAS Card */}
                  <div style={styles.storageCard}>
                    <div style={styles.storageCardHeader}>
                      <span style={styles.storageIcon}>🖥</span>
                      <h3 style={styles.storageCardTitle}>Penyimpanan NAS (SMB)</h3>
                    </div>

                    {status?.smb?.configured ? (
                      status.smb.connected ? (
                        <div style={styles.statusSuccessBox}>
                          <b>✓ Terhubung ke SMB NAS</b>
                          <p style={styles.storageDetail}>
                            Alamat: <code>{status.smb.address}</code>
                          </p>
                        </div>
                      ) : (
                        <div style={styles.statusWarningBox}>
                          <b>⚠ Gagal terhubung ke SMB NAS</b>
                          <p style={styles.storageDetail}>
                            Alamat: <code>{status.smb.address}</code>
                            <br />
                            Detail: {status.smb.detail}
                          </p>
                          <small style={styles.hintText}>
                            Sistem secara otomatis mengalihkan foto ke folder lokal
                            sebagai fail-safe, dan user tetap bisa mengunduh foto langsung.
                          </small>
                        </div>
                      )
                    ) : (
                      <div style={styles.statusMutedBox}>
                        <i>Belum Dikonfigurasi di Environment</i>
                        <p style={styles.storageDetail}>
                          Set <code>SMB_ADDRESS</code> di env atau docker-compose untuk mengaktifkan.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Nextcloud Card */}
                  <div style={styles.storageCard}>
                    <div style={styles.storageCardHeader}>
                      <span style={styles.storageIcon}>☁</span>
                      <h3 style={styles.storageCardTitle}>Nextcloud (WebDAV)</h3>
                    </div>

                    {status?.nextcloud?.configured ? (
                      status.nextcloud.connected ? (
                        <div style={styles.statusSuccessBox}>
                          <b>✓ Terhubung ke Nextcloud WebDAV</b>
                        </div>
                      ) : (
                        <div style={styles.statusWarningBox}>
                          <b>⚠ Gagal terhubung ke Nextcloud</b>
                          <p style={styles.storageDetail}>
                            {status.nextcloud.detail}
                          </p>
                        </div>
                      )
                    ) : (
                      <div style={styles.statusMutedBox}>
                        <i>Belum Dikonfigurasi (Opsional)</i>
                        <p style={styles.storageDetail}>
                          Mendukung upload otomatis via Nextcloud WebDAV API.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Local Disk Card */}
                  <div style={styles.storageCard}>
                    <div style={styles.storageCardHeader}>
                      <span style={styles.storageIcon}>💾</span>
                      <h3 style={styles.storageCardTitle}>Penyimpanan Lokal (Fail-Safe)</h3>
                    </div>
                    <div style={styles.statusSuccessBox}>
                      <b>✓ Selalu Aktif</b>
                      <p style={styles.storageDetail}>
                        Direktori: <code>{status?.local?.directory || "./data"}/uploads</code>
                      </p>
                      <small style={styles.hintText}>
                        Setiap sesi foto dijamin tersimpan ke folder ini, sehingga data
                        tidak akan pernah hilang meskipun jaringan NAS sedang terputus.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 3: KELOLA BACKGROUND TEMA                        */}
            {/* ==================================================== */}
            {activeTab === "backgrounds" && (
              <div style={styles.bgTabWrap}>
                <div style={styles.sectionHeaderRow}>
                  <h2 style={styles.sectionTitle}>Tema Background</h2>
                  <button
                    style={styles.addBtn}
                    onClick={() => {
                      const newBg = {
                        id: `bg-${Date.now()}`,
                        name: "Warna Baru",
                        thumbColor: "#F3C9BE",
                      };
                      saveBackgrounds([...backgrounds, newBg]);
                    }}
                  >
                    + Tambah Background
                  </button>
                </div>

                <div style={styles.bgGrid}>
                  {backgrounds.map((bg) => (
                    <div key={bg.id} style={styles.bgCard}>
                      <div
                        style={{
                          ...styles.bgSwatchPreview,
                          background: bg.thumbColor,
                        }}
                      />
                      <div style={styles.fieldRow}>
                        <label style={styles.label}>Nama Tema</label>
                        <input
                          style={styles.input}
                          value={bg.name}
                          onChange={(e) => {
                            const next = backgrounds.map((b) =>
                              b.id === bg.id ? { ...b, name: e.target.value } : b
                            );
                            setBackgrounds(next);
                          }}
                          onBlur={() => saveBackgrounds(backgrounds)}
                        />
                      </div>
                      <div style={styles.fieldRow}>
                        <label style={styles.label}>Warna Hex</label>
                        <input
                          type="color"
                          style={styles.colorInput}
                          value={bg.thumbColor}
                          onChange={(e) => {
                            const next = backgrounds.map((b) =>
                              b.id === bg.id
                                ? { ...b, thumbColor: e.target.value }
                                : b
                            );
                            saveBackgrounds(next);
                          }}
                        />
                      </div>
                      <button
                        style={styles.deleteBtn}
                        onClick={() =>
                          saveBackgrounds(
                            backgrounds.filter((b) => b.id !== bg.id)
                          )
                        }
                      >
                        🗑 Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Komponen pembantu untuk live canvas preview frame di dalam Admin
 */
function LayoutCanvasPreview({ layout }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !layout) return;
    const canvas = canvasRef.current;
    canvas.width = layout.canvasWidth || 1200;
    canvas.height = layout.canvasHeight || 1800;
    const ctx = canvas.getContext("2d");

    // Latar belakang kanvas
    ctx.fillStyle = "#F6F1E7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gambar slot foto
    (layout.slots || []).forEach((slot, i) => {
      ctx.fillStyle = "rgba(62, 124, 107, 0.15)";
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);

      ctx.strokeStyle = "#3E7C6B";
      ctx.lineWidth = Math.max(3, Math.round(canvas.width * 0.005));
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

      ctx.fillStyle = "#1E1A16";
      const fontSize = Math.max(22, Math.round(canvas.width * 0.04));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = slot.label || `Foto ${i + 1}`;
      ctx.fillText(label, slot.x + slot.width / 2, slot.y + slot.height / 2);
    });

    // Gambar overlay jika ada
    if (layout.frameOverlayUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = layout.frameOverlayUrl;
    }
  }, [layout]);

  return (
    <div style={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        style={{
          ...styles.previewCanvas,
          aspectRatio: `${layout.canvasWidth || 1200} / ${
            layout.canvasHeight || 1800
          }`,
        }}
      />
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
    overflow: "hidden",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "2px solid #1E1A16",
    background: "#F6F1E7",
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    fontSize: 20,
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
    padding: "6px 14px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
    fontWeight: "bold",
  },
  tabsRow: {
    display: "flex",
    borderBottom: "1.5px solid #1E1A16",
    background: "#EDE7D9",
    overflowX: "auto",
  },
  tabBtn: {
    padding: "10px 18px",
    border: "none",
    borderRight: "1px solid #D9D2C2",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: "bold",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabBtnActive: {
    background: "#FFFDF8",
    borderBottom: "3px solid #D8482E",
  },
  saveToast: {
    position: "fixed",
    top: 60,
    right: 20,
    background: "#3E7C6B",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    zIndex: 10001,
    fontWeight: "bold",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px 40px",
    maxWidth: 960,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  layoutManagerWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  frameSelectorBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    paddingBottom: 10,
    borderBottom: "1px dashed #D9D2C2",
  },
  frameChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  frameChip: {
    background: "#fff",
    border: "1.5px solid #1E1A16",
    borderRadius: 20,
    padding: "6px 14px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  },
  frameChipActive: {
    background: "#D8482E",
    color: "#fff",
    borderColor: "#D8482E",
    fontWeight: "bold",
  },
  addFrameBtn: {
    background: "#3E7C6B",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "6px 14px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
  },
  layoutEditorGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr",
    gap: 20,
  },
  previewColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  settingsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  subHeading: {
    fontFamily: "Georgia, serif",
    fontSize: 15,
    margin: "0 0 8px",
  },
  canvasContainer: {
    background: "#EDE7D9",
    border: "2px solid #1E1A16",
    borderRadius: 10,
    padding: 12,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCanvas: {
    width: "100%",
    maxWidth: 240,
    height: "auto",
    display: "block",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  },
  frameUploadBox: {
    background: "#fff",
    border: "1.5px solid #1E1A16",
    borderRadius: 10,
    padding: 12,
  },
  boxTitle: {
    fontSize: 12,
    margin: "0 0 4px",
  },
  hintText: {
    fontSize: 10,
    color: "#8A8073",
    lineHeight: 1.4,
    margin: "0 0 8px",
  },
  uploadBtnLabel: {
    display: "block",
    textAlign: "center",
    background: "#F6F1E7",
    border: "1.5px dashed #1E1A16",
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    cursor: "pointer",
    fontWeight: "bold",
  },
  frameOverlayPreview: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  overlayThumb: {
    maxWidth: 120,
    maxHeight: 140,
    border: "1px solid #1E1A16",
    borderRadius: 4,
    background: "#eee",
  },
  deleteOverlayBtn: {
    background: "transparent",
    color: "#D8482E",
    border: "1px dashed #D8482E",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 10,
    cursor: "pointer",
  },
  sectionCard: {
    background: "#fff",
    border: "1.5px solid #1E1A16",
    borderRadius: 10,
    padding: 14,
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  smallAddBtn: {
    background: "#3E7C6B",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  fieldRow: {
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#8A8073",
    marginBottom: 3,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    fontFamily: "inherit",
    fontSize: 12,
    padding: 8,
    border: "1.5px solid #1E1A16",
    borderRadius: 6,
    boxSizing: "border-box",
  },
  presetButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  presetBtn: {
    background: "#F6F1E7",
    border: "1px solid #1E1A16",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: 10,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  inlineInputs: {
    display: "flex",
    gap: 8,
  },
  slotsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  slotCard: {
    border: "1px solid #D9D2C2",
    borderRadius: 8,
    padding: 8,
    background: "#FFFDF8",
  },
  slotCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  slotOrderBadge: {
    background: "#3E7C6B",
    color: "#fff",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 9,
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  slotLabelInput: {
    flex: 1,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    padding: 4,
    border: "1px solid #D9D2C2",
    borderRadius: 4,
  },
  layerOrderBtns: {
    display: "flex",
    gap: 2,
  },
  orderArrowBtn: {
    background: "#EDE7D9",
    border: "1px solid #1E1A16",
    borderRadius: 4,
    width: 24,
    height: 24,
    cursor: "pointer",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  slotDeleteBtn: {
    background: "transparent",
    border: "none",
    color: "#D8482E",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: "bold",
    padding: "0 4px",
  },
  slotCoordinatesRow: {
    display: "flex",
    gap: 8,
  },
  coordField: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  coordLabel: {
    fontSize: 9,
    color: "#8A8073",
    fontWeight: "bold",
  },
  coordInput: {
    width: "100%",
    fontFamily: "inherit",
    fontSize: 10,
    padding: 4,
    border: "1px solid #D9D2C2",
    borderRadius: 4,
  },
  deleteLayoutBtn: {
    background: "transparent",
    border: "1.5px dashed #D8482E",
    color: "#D8482E",
    borderRadius: 8,
    padding: 8,
    fontFamily: "inherit",
    fontSize: 10,
    cursor: "pointer",
    width: "100%",
  },
  // Storage Tab
  storageTabWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 16,
    margin: 0,
  },
  refreshBtn: {
    background: "transparent",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: "6px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
    fontWeight: "bold",
  },
  storageCardsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  storageCard: {
    background: "#fff",
    border: "1.5px solid #1E1A16",
    borderRadius: 10,
    padding: 16,
  },
  storageCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  storageIcon: {
    fontSize: 18,
  },
  storageCardTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 14,
    margin: 0,
  },
  statusSuccessBox: {
    background: "#EAF3EF",
    border: "1px solid #3E7C6B",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
  },
  statusWarningBox: {
    background: "#FFF3EE",
    border: "1px solid #D8482E",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
  },
  statusMutedBox: {
    background: "#F6F1E7",
    border: "1px dashed #A89F91",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
  },
  storageDetail: {
    margin: "6px 0 0",
    fontSize: 11,
    color: "#6D6457",
  },
  // Backgrounds Tab
  bgTabWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  addBtn: {
    background: "#D8482E",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
  },
  bgGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12,
  },
  bgCard: {
    background: "#fff",
    border: "1.5px solid #1E1A16",
    borderRadius: 10,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  bgSwatchPreview: {
    width: "100%",
    height: 60,
    borderRadius: 6,
    border: "1px solid #1E1A16",
  },
  colorInput: {
    width: "100%",
    height: 36,
    border: "1.5px solid #1E1A16",
    borderRadius: 6,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "transparent",
    border: "1px dashed #D8482E",
    color: "#D8482E",
    borderRadius: 6,
    padding: 6,
    fontFamily: "inherit",
    fontSize: 10,
    cursor: "pointer",
    marginTop: 4,
  },
  muted: {
    fontSize: 12,
    color: "#8A8073",
  },
};
