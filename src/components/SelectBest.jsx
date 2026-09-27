import React, { useEffect, useRef, useState } from "react";
import { renderComposition } from "../utils/compositor.js";

/**
 * SelectBest
 * User memilih foto dari hasil sesi (allPhotos), dibatasi tepat sejumlah requiredShots.
 * Layout dibuat responsif:
 * - Desktop/Tablet: Side-by-side (Frame visual di kiri, galeri foto di kanan)
 * - Mobile: Stacked vertikal dengan pratinjau proporsional
 */
export default function SelectBest({
  allPhotos,
  requiredShots = 1,
  layout,
  background,
  onConfirm,
  onBack,
  onTakeMore,
}) {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const previewCanvasRef = useRef(null);

  const isDone = selectedIndices.length === requiredShots;

  // Render ulang preview frame visual setiap kali pilihan berubah
  useEffect(() => {
    let cancelled = false;
    async function updateFrame() {
      if (!previewCanvasRef.current || !layout) return;
      const chosenPhotos = selectedIndices.map((idx) => allPhotos[idx]);

      await renderComposition(
        previewCanvasRef.current,
        layout,
        background,
        chosenPhotos,
        { showPlaceholders: true }
      );
    }
    updateFrame();
    return () => {
      cancelled = true;
    };
  }, [selectedIndices, allPhotos, layout, background]);

  const handleTogglePhoto = (photoIdx) => {
    const existingSlot = selectedIndices.indexOf(photoIdx);
    if (existingSlot !== -1) {
      setSelectedIndices((prev) => prev.filter((idx) => idx !== photoIdx));
    } else {
      if (selectedIndices.length < requiredShots) {
        setSelectedIndices((prev) => [...prev, photoIdx]);
      }
    }
  };

  const handleRemoveSlot = (slotIdx) => {
    setSelectedIndices((prev) => prev.filter((_, i) => i !== slotIdx));
  };

  const handleConfirm = () => {
    const chosenPhotos = selectedIndices.map((i) => allPhotos[i]);
    onConfirm(chosenPhotos);
  };

  return (
    <div style={styles.wrap} className="screen-fade">
      {/* Topbar */}
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack} className="btn-interactive">
          ‹ Kembali
        </button>
        <span style={styles.stepLabel}>Pilih Foto Terbaik</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.headerArea}>
          <h2 style={styles.title}>Visual Frame & Foto Pilihan</h2>
          <p style={styles.subtext}>
            Pilih <b>{requiredShots} foto</b> terbaikmu untuk mengisi bingkai{" "}
            <b>{layout?.name || "pilihan"}</b>.
          </p>
        </div>

        {/* Main Responsive Split Container */}
        <div style={styles.responsiveSplit}>
          {/* Sisi Kiri / Atas: Visual Frame Live Display */}
          <div style={styles.frameContainer}>
            <div style={styles.frameHeader}>
              <span style={styles.frameTitle}>
                🖼 {layout?.paperHint || "Frame"}
              </span>
              <span
                style={
                  isDone ? styles.badgeComplete : styles.badgePending
                }
                className={isDone ? "pop-badge" : ""}
              >
                {isDone
                  ? "✓ Frame Lengkap!"
                  : `${selectedIndices.length} / ${requiredShots} Terisi`}
              </span>
            </div>

            <div style={styles.canvasWrapper}>
              <canvas
                ref={previewCanvasRef}
                style={{
                  ...styles.canvas,
                  aspectRatio: `${layout?.canvasWidth || 1200} / ${
                    layout?.canvasHeight || 1800
                  }`,
                }}
              />
            </div>

            {/* Slot indicator badges */}
            <div style={styles.slotIndicators}>
              {Array.from({ length: requiredShots }).map((_, slotIdx) => {
                const photoIdx = selectedIndices[slotIdx];
                const isFilled = photoIdx !== undefined;
                const slotLabel =
                  layout?.slots?.[slotIdx]?.label ||
                  `Foto ${slotIdx + 1} (${
                    slotIdx === 0
                      ? "Pertama"
                      : slotIdx === 1
                      ? "Kedua"
                      : slotIdx === 2
                      ? "Ketiga"
                      : slotIdx + 1
                  })`;

                return (
                  <div
                    key={slotIdx}
                    style={{
                      ...styles.slotTag,
                      ...(isFilled ? styles.slotTagFilled : styles.slotTagEmpty),
                    }}
                    onClick={() => isFilled && handleRemoveSlot(slotIdx)}
                    title={isFilled ? "Klik untuk membatalkan slot ini" : ""}
                    className="card-interactive"
                  >
                    <span style={styles.slotNum}>{slotIdx + 1}</span>
                    <span style={styles.slotName}>{slotLabel}</span>
                    {isFilled && <span style={styles.slotCross}>✕</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sisi Kanan / Bawah: Gallery Foto & Aksi */}
          <div style={styles.galleryContainer}>
            <div style={styles.galleryHeader}>
              <span style={styles.galleryTitle}>
                Jepretanmu ({allPhotos.length} foto)
              </span>
              <button
                style={styles.takeMoreBtn}
                onClick={onTakeMore}
                className="btn-interactive"
              >
                + Jepret Lagi
              </button>
            </div>

            <div style={styles.grid}>
              {allPhotos.map((src, i) => {
                const slotPos = selectedIndices.indexOf(i);
                const isChosen = slotPos !== -1;

                return (
                  <div
                    key={i}
                    style={{
                      ...styles.item,
                      border: isChosen
                        ? "3px solid #D8482E"
                        : "2px solid #D9D2C2",
                      boxShadow: isChosen
                        ? "0 4px 12px rgba(216,72,46,0.3)"
                        : "none",
                    }}
                    onClick={() => handleTogglePhoto(i)}
                    className="card-interactive"
                  >
                    <img
                      src={src}
                      alt={`Jepretan ${i + 1}`}
                      style={styles.img}
                    />
                    {isChosen && (
                      <div style={styles.orderBadge} className="pop-badge">
                        #{slotPos + 1}
                      </div>
                    )}
                    <div style={styles.photoIndexBadge}>#{i + 1}</div>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            <div style={styles.ctaRow}>
              <button
                style={{
                  ...styles.btnPrimary,
                  ...(isDone ? {} : styles.btnDisabled),
                }}
                disabled={!isDone}
                onClick={handleConfirm}
                className={isDone ? "btn-interactive pop-badge" : ""}
              >
                {isDone
                  ? "✓ Lanjut ke Tambah Stiker"
                  : `Pilih ${requiredShots - selectedIndices.length} foto lagi`}
              </button>
            </div>
          </div>
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
    padding: "14px 16px 28px",
    maxWidth: 960,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  headerArea: {
    marginBottom: 12,
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(20px, 4vw, 24px)",
    margin: "0 0 2px",
  },
  subtext: {
    fontSize: 12,
    color: "#6D6457",
    margin: 0,
  },
  responsiveSplit: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  frameContainer: {
    background: "#EDE7D9",
    border: "2px solid #1E1A16",
    borderRadius: 12,
    padding: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  frameHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  frameTitle: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  badgePending: {
    background: "#FFF3EE",
    color: "#D8482E",
    border: "1px solid #D8482E",
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 12,
    fontWeight: "bold",
  },
  badgeComplete: {
    background: "#EAF3EF",
    color: "#3E7C6B",
    border: "1.5px solid #3E7C6B",
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 12,
    fontWeight: "bold",
  },
  canvasWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#fff",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: 6,
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    maxWidth: 260,
    maxHeight: "50vh",
    objectFit: "contain",
    height: "auto",
    display: "block",
  },
  slotIndicators: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    justifyContent: "center",
  },
  slotTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 10,
    cursor: "pointer",
  },
  slotTagFilled: {
    background: "#EAF3EF",
    border: "1px solid #3E7C6B",
    color: "#1E1A16",
  },
  slotTagEmpty: {
    background: "#FFF",
    border: "1px dashed #A89F91",
    color: "#8A8073",
  },
  slotNum: {
    background: "#3E7C6B",
    color: "#fff",
    borderRadius: "50%",
    width: 14,
    height: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: "bold",
  },
  slotName: {
    fontWeight: "bold",
  },
  slotCross: {
    color: "#D8482E",
    fontWeight: "bold",
    fontSize: 10,
    marginLeft: 2,
  },
  galleryContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  galleryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  galleryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#6D6457",
  },
  takeMoreBtn: {
    background: "transparent",
    border: "1.5px dashed #1E1A16",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "inherit",
    fontSize: 10,
    cursor: "pointer",
    color: "#1E1A16",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
    gap: 8,
    maxHeight: "44vh",
    overflowY: "auto",
    padding: 2,
  },
  item: {
    position: "relative",
    aspectRatio: "1/1",
    borderRadius: 8,
    cursor: "pointer",
    overflow: "hidden",
    background: "#FFF",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  orderBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    background: "#D8482E",
    color: "#fff",
    borderRadius: 12,
    fontSize: 10,
    padding: "2px 7px",
    fontWeight: "bold",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  },
  photoIndexBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    borderRadius: 4,
    fontSize: 8,
    padding: "1px 4px",
  },
  ctaRow: {
    marginTop: 10,
  },
  btnPrimary: {
    display: "block",
    width: "100%",
    background: "#D8482E",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: 14,
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(216,72,46,0.22)",
  },
  btnDisabled: {
    background: "#D9D2C2",
    color: "#8A8073",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};
