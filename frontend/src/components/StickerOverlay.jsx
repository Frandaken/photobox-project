import React, { useEffect, useRef, useState, useCallback } from "react";
import { STICKERS } from "../data/stickers.js";
import { renderComposition } from "../utils/compositor.js";

/**
 * StickerOverlay
 * Menampilkan hasil komposisi (layout+background+foto) sebagai dasar,
 * lalu user bisa menempel stiker di atasnya dengan drag-drop bebas
 * dan pinch-to-zoom (mendukung mouse & touch lewat Pointer Events).
 *
 * Placement stiker disimpan dalam KOORDINAT KANVAS ASLI (px sesuai
 * layout.canvasWidth/Height), bukan koordinat layar, supaya hasil
 * ekspor akhir presisi terlepas dari ukuran tampilan di device.
 */
export default function StickerOverlay({
  layout,
  background,
  photos,
  onConfirm,
  onBack,
}) {
  const baseCanvasRef = useRef(null); // hasil composite dasar (background+foto), digambar sekali
  const containerRef = useRef(null); // wrapper yang menampung baseCanvas + elemen stiker DOM
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
    setPlacedStickers((prev) => [
      ...prev,
      {
        uid,
        stickerId: sticker.id,
        src: sticker.src,
        x: layout.canvasWidth / 2,
        y: layout.canvasHeight / 2,
        scale: 0.6,
        rotation: 0,
      },
    ]);
    setSelectedUid(uid);
  };

  const removeSelected = () => {
    if (!selectedUid) return;
    setPlacedStickers((prev) => prev.filter((s) => s.uid !== selectedUid));
    setSelectedUid(null);
  };

  const handleConfirm = async () => {
    onConfirm(placedStickers);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={onBack}>‹ Kembali</button>
        <span style={styles.stepLabel}>Overlay Stiker</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Tambahkan stiker</h2>
        <p style={styles.desc}>
          Seret untuk pindah, cubit (pinch) untuk perbesar/kecilkan. Ketuk stiker untuk pilih, lalu hapus kalau perlu.
        </p>

        <div
          ref={containerRef}
          style={{
            ...styles.canvasWrap,
            aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
          }}
          onPointerDown={() => setSelectedUid(null)}
        >
          <canvas ref={baseCanvasRef} style={styles.baseCanvas} />
          {!baseReady && <div style={styles.loadingHint}>Menyusun komposisi…</div>}

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

        <p style={styles.pickerLabel}>Pilih stiker untuk ditambahkan</p>
        <div style={styles.stickerRow}>
          {STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              style={styles.stickerBtn}
              onClick={() => addSticker(sticker)}
              title={sticker.name}
            >
              <img src={sticker.src} alt={sticker.name} style={styles.stickerThumb} />
            </button>
          ))}
        </div>

        {selectedUid && (
          <button style={styles.removeBtn} onClick={removeSelected}>
            🗑 Hapus stiker terpilih
          </button>
        )}

        <div style={styles.ctaRow}>
          <button style={styles.btnPrimary} onClick={handleConfirm}>
            Lanjut ke Digital Copy
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * DraggableSticker
 * Elemen DOM (bukan digambar di canvas) yang ditampilkan di atas base canvas,
 * memakai Pointer Events untuk drag (1 jari/mouse) dan pinch-zoom (2 jari).
 * Posisi disimpan dalam koordinat kanvas asli lalu dikonversi ke % untuk
 * ditampilkan, supaya tetap presisi di berbagai ukuran layar.
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
  const pointers = useRef(new Map()); // pointerId -> {x, y} dalam px layar
  const dragState = useRef(null); // untuk 1 pointer: offset drag
  const pinchState = useRef(null); // untuk 2 pointer: jarak awal & scale awal

  const getContainerRect = () => containerRef.current.getBoundingClientRect();

  const handlePointerDown = (e) => {
    e.stopPropagation();
    onSelect();
    elRef.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      const rect = getContainerRect();
      const px = ((e.clientX - rect.left) / rect.width) * canvasWidth;
      const py = ((e.clientY - rect.top) / rect.height) * canvasHeight;
      dragState.current = {
        offsetX: sticker.x - px,
        offsetY: sticker.y - py,
      };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchState.current = { startDist: dist, startScale: sticker.scale };
      dragState.current = null; // pinch mengambil alih dari drag
    }
  };

  const handlePointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const rect = getContainerRect();

    if (pointers.current.size === 2 && pinchState.current) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / (pinchState.current.startDist || 1);
      const nextScale = Math.min(
        Math.max(pinchState.current.startScale * ratio, 0.15),
        3
      );
      onChange({ scale: nextScale });
      return;
    }

    if (pointers.current.size === 1 && dragState.current) {
      const px = ((e.clientX - rect.left) / rect.width) * canvasWidth;
      const py = ((e.clientY - rect.top) / rect.height) * canvasHeight;
      onChange({
        x: px + dragState.current.offsetX,
        y: py + dragState.current.offsetY,
      });
    }
  };

  const handlePointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    if (pointers.current.size === 0) dragState.current = null;
  };

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: `${(sticker.x / canvasWidth) * 100}%`,
        top: `${(sticker.y / canvasHeight) * 100}%`,
        width: `${(140 * sticker.scale / canvasWidth) * 100}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        touchAction: "none",
        cursor: "grab",
        outline: selected ? "2px dashed #D8482E" : "none",
        outlineOffset: 4,
        borderRadius: 8,
      }}
    >
      <img
        src={sticker.src}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" }}
      />
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
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 20,
    margin: "0 0 4px",
  },
  desc: {
    fontSize: 11,
    color: "#8A8073",
    margin: "0 0 12px",
    lineHeight: 1.5,
  },
  canvasWrap: {
    position: "relative",
    width: "100%",
    background: "#EDE7D9",
    border: "2px solid #1E1A16",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
    touchAction: "none",
  },
  baseCanvas: {
    width: "100%",
    height: "100%",
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
  pickerLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#8A8073",
    margin: "0 0 6px",
  },
  stickerRow: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 8,
  },
  stickerBtn: {
    flex: "0 0 auto",
    width: 52,
    height: 52,
    borderRadius: 8,
    border: "1.5px solid #1E1A16",
    background: "#fff",
    cursor: "pointer",
    padding: 4,
  },
  stickerThumb: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  removeBtn: {
    marginTop: 8,
    background: "transparent",
    border: "1.5px dashed #D8482E",
    color: "#D8482E",
    borderRadius: 8,
    padding: 10,
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  },
  ctaRow: {
    marginTop: "auto",
    paddingTop: 14,
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
  },
};
