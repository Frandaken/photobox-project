import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * PhotoSession
 * Komponen sesi foto photobox: live camera preview + capture tanpa timer.
 *
 * Props:
 *  - requiredShots: jumlah foto minimal yang dibutuhkan frame yang dipilih user (mis. 4)
 *  - onFinish: callback(photos: string[] dataURL[]) dipanggil saat user tekan "Selesai Ambil Foto"
 *  - onBack: callback saat user tekan tombol kembali (opsional)
 */
export default function PhotoSession({ requiredShots = 4, onFinish, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [photos, setPhotos] = useState([]); // array of dataURL
  const [facingMode, setFacingMode] = useState("user"); // 'user' = depan, 'environment' = belakang
  const [hasMultipleCams, setHasMultipleCams] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  // Cek apakah device punya lebih dari 1 kamera (mis HP depan/belakang)
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((devices) => {
      const cams = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCams(cams.length > 1);
    }).catch(() => {});
  }, []);

  const startCamera = useCallback(async (mode) => {
    setError(null);
    setReady(false);
    // stop stream lama dulu kalau ada
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (err) {
      console.error(err);
      setError(
        "Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan pada browser."
      );
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Kalau kamera depan, preview di-mirror untuk UX,
    // tapi hasil capture disimpan TIDAK mirror (orientasi natural/asli)
    ctx.save();
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotos((prev) => [...prev, dataUrl]);

    // efek flash singkat untuk feedback visual
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  const handleDelete = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const canFinish = photos.length >= requiredShots;

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        {onBack && (
          <button style={styles.backBtn} onClick={onBack}>
            ‹ Kembali
          </button>
        )}
        <span style={styles.stepLabel}>Sesi Foto</span>
        <span style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>Ambil fotomu</h2>
        <p style={styles.noTimerNote}>⏱ Tanpa batas waktu — jepret sepuasnya</p>

        <div style={styles.camWrap}>
          {error ? (
            <div style={styles.errorBox}>{error}</div>
          ) : (
            <>
              <video
                ref={videoRef}
                style={{
                  ...styles.video,
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
                playsInline
                muted
              />
              {flash && <div style={styles.flashOverlay} />}
              <span style={styles.liveBadge}>
                <i style={styles.liveDot} /> LIVE
              </span>
              <span style={styles.countBadge}>
                {photos.length} foto diambil
                {requiredShots ? ` · perlu min. ${requiredShots}` : ""}
              </span>
            </>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={styles.shutterRow}>
          {hasMultipleCams ? (
            <button style={styles.flipBtn} onClick={handleFlip} title="Ganti kamera">
              ⟲
            </button>
          ) : (
            <span style={{ width: 36 }} />
          )}
          <button
            style={styles.shutterBtn}
            onClick={handleCapture}
            disabled={!ready}
            aria-label="Ambil foto"
          />
          <span style={{ width: 36 }} />
        </div>

        <p style={styles.thumbLabel}>Hasil jepretan (geser →)</p>
        <div style={styles.thumbStrip}>
          {photos.map((src, i) => (
            <div key={i} style={styles.thumbItem}>
              <img src={src} alt={`Jepretan ${i + 1}`} style={styles.thumbImg} />
              <button
                style={styles.thumbDelete}
                onClick={() => handleDelete(i)}
                aria-label="Hapus foto"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length === 0 && (
            <div style={styles.emptyThumbHint}>Belum ada foto — mulai jepret ✨</div>
          )}
        </div>

        <div style={styles.ctaRow}>
          <button
            style={{
              ...styles.btnPrimary,
              ...(canFinish ? {} : styles.btnDisabled),
            }}
            disabled={!canFinish}
            onClick={() => onFinish?.(photos)}
          >
            {canFinish
              ? "Selesai Ambil Foto"
              : `Ambil ${requiredShots - photos.length} foto lagi`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
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
    display: "flex",
    flexDirection: "column",
    maxWidth: 480,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 20,
    margin: "0 0 4px",
  },
  noTimerNote: {
    fontSize: 11,
    color: "#3E7C6B",
    fontWeight: "bold",
    margin: "0 0 12px",
  },
  camWrap: {
    position: "relative",
    background: "#111",
    borderRadius: 12,
    aspectRatio: "4/3",
    overflow: "hidden",
    marginBottom: 14,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  flashOverlay: {
    position: "absolute",
    inset: 0,
    background: "#fff",
    opacity: 0.7,
  },
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    background: "#D8482E",
    color: "#fff",
    fontSize: 9,
    padding: "2px 8px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    background: "#fff",
    borderRadius: "50%",
    display: "inline-block",
  },
  countBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 10,
    padding: "4px 9px",
    borderRadius: 10,
  },
  errorBox: {
    padding: 20,
    color: "#D8482E",
    fontSize: 12,
    textAlign: "center",
  },
  shutterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    margin: "16px 0",
  },
  shutterBtn: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    background: "#D8482E",
    border: "4px solid #1E1A16",
    cursor: "pointer",
  },
  flipBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#FFFDF8",
    border: "2px solid #1E1A16",
    fontSize: 14,
    cursor: "pointer",
  },
  thumbLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#8A8073",
    margin: "0 0 6px",
  },
  thumbStrip: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 8,
    minHeight: 60,
  },
  thumbItem: {
    position: "relative",
    flex: "0 0 auto",
    width: 56,
    height: 56,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #1E1A16",
    display: "block",
  },
  thumbDelete: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#1E1A16",
    color: "#fff",
    border: "none",
    fontSize: 9,
    cursor: "pointer",
    lineHeight: "18px",
    padding: 0,
  },
  emptyThumbHint: {
    fontSize: 11,
    color: "#8A8073",
    padding: "18px 0",
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
  btnDisabled: {
    background: "#D9D2C2",
    cursor: "not-allowed",
  },
};
