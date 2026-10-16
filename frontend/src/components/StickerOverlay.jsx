import React, { useEffect, useRef, useState, useCallback } from "react";
import { STICKERS } from "../data/stickers.js";
import { renderComposition } from "../utils/compositor.js";

/**
 * StickerOverlay
 * Menampilkan hasil komposisi (layout+background+foto) sebagai dasar,
 * lalu user bisa menempel stiker di atasnya dengan:
 * 1. Drag & drop bebas
 * 2. Pinch-to-zoom 2 jari yang mulus & responsif
 * 3. Handle pojok untuk drag-resize & rotate dengan 1 jari / mouse
 * 4. Tombol kontrol zoom (+ / -) dan putar 45° di toolbar
 * 5. Scroll wheel zoom untuk mouse
 */
export default function StickerOverlay({
  layout,
  background,
  photos,
  onConfirm,
  onBack,
}) {
  const baseCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [baseReady, setBaseReady] = useState(false);
  const [placedStickers, setPlacedStickers] = useState([]); // {uid, stickerId, src, x, y, scale, rotation}
  const [selectedUid, setSelectedUid] = useState(null);

  // Render komposisi dasar sekali saat layout/background/photos siap
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!baseCanvasRef.current) return;
      await renderComposition(baseCanvasRef.current, layout, background, photos);
      if (!cancelled) setBaseReady(true);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [layout, background, photos]);

  const addSticker = (sticker) => {
    const uid = `${sticker.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newSticker = {
      uid,
      stickerId: sticker.id,
      src: sticker.src,
      x: layout.canvasWidth / 2,
      y: layout.canvasHeight / 2,
      scale: 0.65,
      rotation: 0,
    };
    setPlacedStickers((prev) => [...prev, newSticker]);
    setSelectedUid(uid);
  };

  const removeSelected = () => {
    if (!selectedUid) return;
    setPlacedStickers((prev) => prev.filter((s) => s.uid !== selectedUid));
    setSelectedUid(null);
  };

  const selectedSticker = placedStickers.find((s) => s.uid === selectedUid);

  const updateSelectedSticker = (changes) => {
    if (!selectedUid) return;
    setPlacedStickers((prev) =>
      prev.map((s) => (s.uid === selectedUid ? { ...s, ...changes } : s))
    );
  };

  const adjustScale = (delta) => {
    if (!selectedSticker) return;
    const nextScale = Math.min(Math.max(selectedSticker.scale + delta, 0.2), 3.0);
    updateSelectedSticker({ scale: nextScale });
  };

  const rotateSticker = (degrees = 45) => {
    if (!selectedSticker) return;
    const nextRot = ((selectedSticker.rotation || 0) + degrees) % 360;
    updateSelectedSticker({ rotation: nextRot });
  };

  const handleConfirm = async () => {
    onConfirm(placedStickers);
  };

  return (
    <div style={styles.wrap} className="screen-fade">
      {/* Topbar */}
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack} className="btn-interactive">
          ‹ Kembali
        </button>
        <span style={styles.stepLabel}>Dekorasi Stiker</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.headerArea}>
          <h2 style={styles.title}>Tambahkan Stiker Lucu</h2>
          <p style={styles.desc}>
            Cubit (pinch) 2 jari, seret pojok stiker, atau gunakan tombol di bawah untuk perbesar/kecilkan.
          </p>
        </div>

        {/* Canvas Wrapper */}
        <div
          ref={containerRef}
          style={{
            ...styles.canvasWrap,
            aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
          }}
          onPointerDown={(e) => {
            // Tap area kosong kanvas untuk unselect
            if (e.target === containerRef.current || e.target === baseCanvasRef.current) {
              setSelectedUid(null);
            }
          }}
        >
          <canvas ref={baseCanvasRef} style={styles.baseCanvas} />
          {!baseReady && <div style={styles.loadingHint}>Menyusun frame…</div>}

          {baseReady &&
            placedStickers.map((s) => (
              <DraggableSticker
                key={s.uid}
                sticker={s}
                containerRef={containerRef}
                canvasWidth={layout.canvasWidth}
                canvasHeight={layout.canvasHeight}
                selected={selectedUid === s.uid}
                onSelect={() => setSelectedUid(s.uid)}
                onChange={(next) =>
                  setPlacedStickers((prev) =>
                    prev.map((p) => (p.uid === s.uid ? { ...p, ...next } : p))
                  )
                }
              />
            ))}
        </div>

        {/* Floating Quick Controls saat ada stiker terpilih */}
        {selectedSticker && (
          <div style={styles.selectedControlsBar} className="pop-badge">
            <span style={styles.controlHint}>Stiker Terpilih:</span>
            <div style={styles.controlButtonGroup}>
              <button
                style={styles.toolBtn}
                onClick={() => adjustScale(-0.15)}
                title="Perkecil stiker"
                className="btn-interactive"
              >
                🔍➖ Perkecil
              </button>
              <button
                style={styles.toolBtn}
                onClick={() => adjustScale(0.15)}
                title="Perbesar stiker"
                className="btn-interactive"
              >
                🔍➕ Perbesar
              </button>
              <button
                style={styles.toolBtn}
                onClick={() => rotateSticker(45)}
                title="Putar 45 derajat"
                className="btn-interactive"
              >
                🔄 Putar
              </button>
              <button
                style={styles.toolBtnDelete}
                onClick={removeSelected}
                title="Hapus stiker terpilih"
                className="btn-interactive"
              >
                🗑 Hapus
              </button>
            </div>
          </div>
        )}

        {/* Palet Pilihan Stiker */}
        <div style={styles.pickerSection}>
          <span style={styles.pickerLabel}>PILIH STIKER (+ Tambahkan)</span>
          <div style={styles.stickerRow}>
            {STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                style={styles.stickerBtn}
                onClick={() => addSticker(sticker)}
                title={sticker.name}
                className="card-interactive"
              >
                <img
                  src={sticker.src}
                  alt={sticker.name}
                  style={styles.stickerThumb}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Tombol Selesai */}
        <div style={styles.ctaRow}>
          <button
            style={styles.btnPrimary}
            onClick={handleConfirm}
            className="btn-interactive"
          >
            Lanjut ke Salinan Digital ➔
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * DraggableSticker
 * Komponen stiker interaktif dengan:
 * - 2-finger pinch to zoom (touch event listener)
 * - 1-finger / mouse drag
 * - Wheel zoom
 * - Corner resize handle
 * - Rotasi presisi
 */
function DraggableSticker({
  sticker,
  containerRef,
  canvasWidth,
  canvasHeight,
  selected,
  onSelect,
  onChange,
}) {
  const elRef = useRef(null);
  const dragState = useRef(null);
  const pinchState = useRef(null);

  const getContainerRect = () => containerRef.current.getBoundingClientRect();

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextScale = Math.min(Math.max((sticker.scale || 1) + delta, 0.2), 3.0);
    onChange({ scale: nextScale });
  };

  // Touch Event Listener untuk Pinch-To-Zoom 2 Jari yang Halus
  const handleTouchStart = (e) => {
    e.stopPropagation();
    onSelect();

    if (e.touches.length === 2) {
      // 2 jari: mulai pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchState.current = {
        startDist: dist,
        startScale: sticker.scale || 1,
      };
      dragState.current = null;
    } else if (e.touches.length === 1) {
      // 1 jari: drag posisi
      const touch = e.touches[0];
      const rect = getContainerRect();
      const px = ((touch.clientX - rect.left) / rect.width) * canvasWidth;
      const py = ((touch.clientY - rect.top) / rect.height) * canvasHeight;
      dragState.current = {
        offsetX: sticker.x - px,
        offsetY: sticker.y - py,
      };
      pinchState.current = null;
    }
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    const rect = getContainerRect();

    if (e.touches.length === 2 && pinchState.current) {
      // Hitung rasio pinch
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / (pinchState.current.startDist || 1);
      const nextScale = Math.min(
        Math.max(pinchState.current.startScale * ratio, 0.2),
        3.0
      );
      onChange({ scale: nextScale });
      return;
    }

    if (e.touches.length === 1 && dragState.current) {
      const touch = e.touches[0];
      const px = ((touch.clientX - rect.left) / rect.width) * canvasWidth;
      const py = ((touch.clientY - rect.top) / rect.height) * canvasHeight;
      onChange({
        x: px + dragState.current.offsetX,
        y: py + dragState.current.offsetY,
      });
    }
  };

  const handleTouchEnd = () => {
    dragState.current = null;
    pinchState.current = null;
  };

  // Mouse Drag Handler (Desktop)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Hanya klik kiri
    e.stopPropagation();
    onSelect();

    const rect = getContainerRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const py = ((e.clientY - rect.top) / rect.height) * canvasHeight;

    const startOffsetX = sticker.x - px;
    const startOffsetY = sticker.y - py;

    const onMouseMove = (moveEvent) => {
      const curRect = getContainerRect();
      const curPx = ((moveEvent.clientX - curRect.left) / curRect.width) * canvasWidth;
      const curPy = ((moveEvent.clientY - curRect.top) / curRect.height) * canvasHeight;
      onChange({
        x: curPx + startOffsetX,
        y: curPy + startOffsetY,
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Corner Resize Handle Drag Handler
  const handleResizeHandleDown = (e) => {
    e.stopPropagation();
    e.preventDefault();

    const startClientX = e.clientX || e.touches?.[0]?.clientX;
    const startScale = sticker.scale || 1;

    const onHandleMove = (moveEvt) => {
      const curX = moveEvt.clientX || moveEvt.touches?.[0]?.clientX;
      if (!curX) return;
      const deltaX = (curX - startClientX) * 0.015;
      const nextScale = Math.min(Math.max(startScale + deltaX, 0.2), 3.0);
      onChange({ scale: nextScale });
    };

    const onHandleUp = () => {
      window.removeEventListener("mousemove", onHandleMove);
      window.removeEventListener("mouseup", onHandleUp);
      window.removeEventListener("touchmove", onHandleMove);
      window.removeEventListener("touchend", onHandleUp);
    };

    window.addEventListener("mousemove", onHandleMove);
    window.addEventListener("mouseup", onHandleUp);
    window.addEventListener("touchmove", onHandleMove, { passive: false });
    window.addEventListener("touchend", onHandleUp);
  };

  return (
    <div
      ref={elRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={{
        position: "absolute",
        left: `${(sticker.x / canvasWidth) * 100}%`,
        top: `${(sticker.y / canvasHeight) * 100}%`,
        width: `${(150 * (sticker.scale || 1) / canvasWidth) * 100}%`,
        aspectRatio: "1 / 1",
        transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg)`,
        touchAction: "none",
        cursor: "grab",
        outline: selected ? "2.5px dashed #D8482E" : "none",
        outlineOffset: 5,
        borderRadius: 8,
        userSelect: "none",
      }}
    >
      <img
        src={sticker.src}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          userSelect: "none",
          display: "block",
        }}
      />

      {/* Corner Resize Handle saat stiker terpilih */}
      {selected && (
        <div
          onMouseDown={handleResizeHandleDown}
          onTouchStart={handleResizeHandleDown}
          title="Tarik untuk perbesar / perkecil"
          style={{
            position: "absolute",
            right: -10,
            bottom: -10,
            width: 24,
            height: 24,
            background: "#D8482E",
            color: "#fff",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            cursor: "nwse-resize",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            touchAction: "none",
          }}
        >
          ⤡
        </div>
      )}
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
    padding: "12px 16px 20px",
    maxWidth: 520,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  headerArea: {
    marginBottom: 8,
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(18px, 4vw, 22px)",
    margin: "0 0 2px",
  },
  desc: {
    fontSize: 11,
    color: "#6D6457",
    margin: 0,
    lineHeight: 1.4,
  },
  canvasWrap: {
    position: "relative",
    width: "100%",
    maxHeight: "48vh",
    background: "#EDE7D9",
    border: "2px solid #1E1A16",
    borderRadius: 12,
    overflow: "hidden",
    margin: "8px 0 10px",
    touchAction: "none",
    boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  baseCanvas: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },
  loadingHint: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    color: "#8A8073",
  },
  selectedControlsBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    background: "#EDE7D9",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: "6px 10px",
    marginBottom: 10,
  },
  controlHint: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6D6457",
    textTransform: "uppercase",
  },
  controlButtonGroup: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  toolBtn: {
    background: "#fff",
    border: "1px solid #1E1A16",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  toolBtnDelete: {
    background: "#FFF3EE",
    border: "1px solid #D8482E",
    color: "#D8482E",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  pickerSection: {
    marginBottom: 10,
  },
  pickerLabel: {
    display: "block",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#8A8073",
    fontWeight: "bold",
    marginBottom: 6,
  },
  stickerRow: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 6,
  },
  stickerBtn: {
    flex: "0 0 auto",
    width: 52,
    height: 52,
    borderRadius: 8,
    border: "1.5px solid #1E1A16",
    background: "#fff",
    cursor: "pointer",
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerThumb: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  ctaRow: {
    marginTop: "auto",
    paddingTop: 8,
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
};
