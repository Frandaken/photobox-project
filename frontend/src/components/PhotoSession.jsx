import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Sound synthesis helper using Web Audio API (zero external assets, works offline).
 */
function playBeep(freq = 600, duration = 0.08) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export default function PhotoSession({ requiredShots = 3, onFinish, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [photos, setPhotos] = useState([]); // array of dataURL
  const [facingMode, setFacingMode] = useState("user");
  const [hasMultipleCams, setHasMultipleCams] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  // Timer configuration: 0 (Off), 3 (3 detik), 5 (5 detik), 10 (10 detik)
  const [timerDuration, setTimerDuration] = useState(0);
  const [countdown, setCountdown] = useState(null); // null = not counting down, number = remaining seconds

  // Cek apakah device punya lebih dari 1 kamera
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const cams = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCams(cams.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode) => {
      setError(null);
      setReady(false);
      stopCurrentStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Fitur kamera tidak didukung atau dibatasi pada browser/konteks saat ini."
        );
        return;
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

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;

          video.onloadedmetadata = () => {
            video
              .play()
              .then(() => setReady(true))
              .catch((playErr) => {
                console.warn("Video play caught:", playErr);
                setReady(true);
              });
          };
        }
      } catch (err) {
        console.warn("Kamera tidak dapat diakses:", err);
        const isNotAllowed =
          err?.name === "NotAllowedError" ||
          err?.name === "SecurityError" ||
          err?.message?.includes("not allowed");

        if (isNotAllowed) {
          setError(
            "Akses kamera tidak diizinkan oleh browser atau dibatasi oleh izin iframe."
          );
        } else {
          setError(
            `Kamera tidak tersedia (${err?.message || "Periksa izin perangkat"}).`
          );
        }
      }
    },
    [stopCurrentStream]
  );

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCurrentStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [facingMode, startCamera, stopCurrentStream]);

  // Eksekusi jepret foto fisik ke canvas
  const executeCapture = () => {
    playBeep(900, 0.15);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.save();
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotos((prev) => [...prev, dataUrl]);

    // Flash animasi
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
  };

  // Trigger tombol jepret: baik langsung maupun via timer countdown
  const handleShutterClick = () => {
    if (!ready || countdown !== null) return;

    if (timerDuration === 0) {
      // Tanpa timer: langsung jepret
      executeCapture();
      return;
    }

    // Dengan timer: mulai countdown 3d, 5d, atau 10d
    let currentSec = timerDuration;
    setCountdown(currentSec);
    playBeep(520, 0.08);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      currentSec -= 1;
      if (currentSec <= 0) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        setCountdown(null);
        executeCapture();
      } else {
        setCountdown(currentSec);
        playBeep(currentSec === 1 ? 750 : 520, 0.08);
      }
    }, 1000);
  };

  const handleCancelCountdown = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCountdown(null);
  };

  // Tambahkan foto dari unggahan file pengguna
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        if (dataUrl) {
          setPhotos((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  // Buat foto demo berkualitas untuk pengujian saat kamera diblokir
  const handleAddDemoPhoto = () => {
    playBeep(700, 0.1);
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    const count = photos.length;
    const palettes = [
      { bg1: "#FFDFBA", bg2: "#FFB3BA", accent: "#BAE1FF", label: "Pose Keren 😎", emoji: "✨" },
      { bg1: "#BAFFC9", bg2: "#BAE1FF", accent: "#FFFFBA", label: "Senyum Manis 😊", emoji: "💖" },
      { bg1: "#FFFFBA", bg2: "#FFDFBA", accent: "#FFB3BA", label: "Gaya Bebas ✌️", emoji: "🎉" },
      { bg1: "#E8D7F1", bg2: "#D3BCC0", accent: "#A1C6EA", label: "Vintage Vibes 📷", emoji: "🌟" },
    ];
    const theme = palettes[count % palettes.length];

    const grad = ctx.createLinearGradient(0, 0, 960, 720);
    grad.addColorStop(0, theme.bg1);
    grad.addColorStop(1, theme.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 720);

    ctx.strokeStyle = "#1E1A16";
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 920, 680);

    ctx.fillStyle = "#1E1A16";
    ctx.beginPath();
    ctx.arc(480, 310, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(480, 560, 220, 160, 0, 0, Math.PI);
    ctx.fill();

    ctx.font = "72px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(theme.emoji, 480, 315);

    ctx.font = "bold 36px 'Courier New', monospace";
    ctx.fillStyle = "#1E1A16";
    ctx.fillText(`Photobox #${count + 1} · ${theme.label}`, 480, 650);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotos((prev) => [...prev, dataUrl]);

    setFlash(true);
    setTimeout(() => setFlash(false), 140);
  };

  const handleDelete = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const canFinish = photos.length >= requiredShots;

  return (
    <div style={styles.wrap} className="screen-fade">
      {/* Topbar */}
      <div style={styles.topbar}>
        {onBack && (
          <button style={styles.backBtn} onClick={onBack} className="btn-interactive">
            ‹ Kembali
          </button>
        )}
        <span style={styles.stepLabel}>Sesi Foto</span>
        <button
          style={styles.uploadAltBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Unggah foto langsung dari galeri / file"
          className="btn-interactive"
        >
          📁 Unggah File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </div>

      <div style={styles.content}>
        {/* Header & Timer Controls */}
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Ambil Fotomu</h2>
            <p style={styles.subtext}>
              {countdown !== null
                ? `Bersiap dalam ${countdown} detik... 📸`
                : timerDuration > 0
                ? `⏱ Timer ${timerDuration} detik aktif`
                : "⏱ Tanpa timer — jepret sepuasnya"}
            </p>
          </div>

          {/* Opsi Timer: Off, 3d, 5d, 10d */}
          <div style={styles.timerPicker}>
            <span style={styles.timerLabel}>Timer:</span>
            {[
              { val: 0, label: "Off" },
              { val: 3, label: "3d" },
              { val: 5, label: "5d" },
              { val: 10, label: "10d" },
            ].map((opt) => (
              <button
                key={opt.val}
                style={{
                  ...styles.timerBtn,
                  ...(timerDuration === opt.val ? styles.timerBtnActive : {}),
                }}
                onClick={() => setTimerDuration(opt.val)}
                className="btn-interactive"
                disabled={countdown !== null}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- Viewfinder Kamera / Fallback Box --- */}
        <div style={styles.camWrap}>
          {error ? (
            <div style={styles.errorFallbackContainer}>
              <div style={styles.fallbackIcon}>📷</div>
              <h3 style={styles.fallbackTitle}>Akses Kamera Terkendala</h3>
              <p style={styles.fallbackDesc}>{error}</p>

              <div style={styles.fallbackActions}>
                <button
                  style={styles.btnPrimarySmall}
                  onClick={() => startCamera(facingMode)}
                  className="btn-interactive"
                >
                  🔄 Coba Izinkan Kamera
                </button>
                <button
                  style={styles.btnSecondarySmall}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-interactive"
                >
                  📁 Unggah Foto dari Perangkat
                </button>
                <button
                  style={styles.btnOutlineSmall}
                  onClick={handleAddDemoPhoto}
                  className="btn-interactive"
                >
                  ✨ Ambil Jepretan Demo (+1)
                </button>
              </div>
            </div>
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

              {/* Flash Animasi Putih */}
              {flash && <div style={styles.flashOverlay} />}

              {/* Animated Countdown Overlay */}
              {countdown !== null && (
                <div style={styles.countdownOverlay}>
                  <div style={styles.countdownBox} className="pop-badge">
                    <span style={styles.countdownNum}>{countdown}</span>
                    <span style={styles.countdownTip}>BERSIAPLAH! ✨</span>
                  </div>
                  <button
                    style={styles.cancelCountdownBtn}
                    onClick={handleCancelCountdown}
                    className="btn-interactive"
                  >
                    ✕ Batalkan Timer
                  </button>
                </div>
              )}

              <span style={styles.liveBadge}>
                <i style={styles.liveDot} /> LIVE
              </span>
              <span style={styles.countBadge}>
                {photos.length} foto diambil · perlu min. {requiredShots}
              </span>
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* --- Shutter Controls Bar --- */}
        {!error && (
          <div style={styles.shutterRow}>
            {hasMultipleCams ? (
              <button
                style={styles.sideControlBtn}
                onClick={handleFlip}
                title="Ganti kamera"
                className="btn-interactive"
              >
                ⟲
              </button>
            ) : (
              <button
                style={styles.sideControlBtn}
                onClick={handleAddDemoPhoto}
                title="Tambah pose demo untuk simulasi cepat"
                className="btn-interactive"
              >
                ✨
              </button>
            )}

            {/* Shutter Button */}
            <button
              style={{
                ...styles.shutterBtn,
                ...(ready ? {} : styles.shutterDisabled),
                ...(countdown !== null ? styles.shutterCounting : {}),
              }}
              onClick={handleShutterClick}
              disabled={!ready || countdown !== null}
              aria-label="Ambil foto"
              title={
                timerDuration > 0
                  ? `Jepret dengan timer ${timerDuration} detik`
                  : "Ambil foto sekarang"
              }
              className="btn-interactive"
            >
              {countdown !== null ? (
                <span style={styles.shutterCountdownText}>{countdown}</span>
              ) : timerDuration > 0 ? (
                <span style={styles.shutterTimerBadge}>{timerDuration}s</span>
              ) : null}
            </button>

            <button
              style={styles.sideControlBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Unggah foto dari file/galeri"
              className="btn-interactive"
            >
              📁
            </button>
          </div>
        )}

        {/* --- Thumbnails Strip --- */}
        <div style={styles.thumbArea}>
          <div style={styles.thumbHeader}>
            <span style={styles.thumbLabel}>
              Hasil jepretan ({photos.length}) — geser ke kanan
            </span>
            {error && (
              <button
                style={styles.inlineDemoBtn}
                onClick={handleAddDemoPhoto}
                className="btn-interactive"
              >
                + Tambah Pose Demo
              </button>
            )}
          </div>

          <div style={styles.thumbStrip}>
            {photos.map((src, i) => (
              <div key={i} style={styles.thumbItem} className="card-interactive">
                <img
                  src={src}
                  alt={`Jepretan ${i + 1}`}
                  style={styles.thumbImg}
                />
                <button
                  style={styles.thumbDelete}
                  onClick={() => handleDelete(i)}
                  aria-label="Hapus foto"
                >
                  ✕
                </button>
                <span style={styles.thumbNum}>#{i + 1}</span>
              </div>
            ))}
            {photos.length === 0 && (
              <div style={styles.emptyThumbHint}>
                Belum ada foto — tekan tombol bulat untuk jepret atau unggah foto ✨
              </div>
            )}
          </div>
        </div>

        {/* --- Tombol Lanjut --- */}
        <div style={styles.ctaRow}>
          <button
            style={{
              ...styles.btnPrimary,
              ...(canFinish ? {} : styles.btnDisabled),
            }}
            disabled={!canFinish}
            onClick={() => onFinish?.(photos)}
            className={canFinish ? "btn-interactive" : ""}
          >
            {canFinish
              ? `✓ Selesai Ambil Foto (${photos.length} Terkumpul)`
              : `Ambil minimal ${requiredShots - photos.length} foto lagi`}
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
  uploadAltBtn: {
    background: "transparent",
    border: "1.5px solid #1E1A16",
    borderRadius: 8,
    padding: "6px 10px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    padding: "12px 16px 20px",
    display: "flex",
    flexDirection: "column",
    maxWidth: 520,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(18px, 4vw, 22px)",
    margin: "0 0 2px",
  },
  subtext: {
    fontSize: 11,
    color: "#3E7C6B",
    fontWeight: "bold",
    margin: 0,
  },
  timerPicker: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#EDE7D9",
    border: "1px solid #1E1A16",
    borderRadius: 20,
    padding: "3px 6px",
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6D6457",
    paddingLeft: 4,
  },
  timerBtn: {
    background: "transparent",
    border: "none",
    borderRadius: 14,
    padding: "4px 8px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
    color: "#1E1A16",
    transition: "all 0.15s ease",
  },
  timerBtnActive: {
    background: "#D8482E",
    color: "#fff",
    boxShadow: "0 2px 4px rgba(216,72,46,0.3)",
  },
  camWrap: {
    position: "relative",
    background: "#111",
    borderRadius: 12,
    aspectRatio: "4/3",
    overflow: "hidden",
    marginBottom: 10,
    boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
    maxHeight: "48vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    animation: "flashEffect 0.18s ease-out forwards",
    pointerEvents: "none",
    zIndex: 10,
  },
  countdownOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8,
  },
  countdownBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownNum: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(72px, 18vw, 110px)",
    fontWeight: "bold",
    color: "#FFFDF8",
    lineHeight: 1,
    textShadow: "0 0 25px rgba(216,72,46,0.9), 0 0 50px rgba(227,166,62,0.8)",
  },
  countdownTip: {
    fontSize: 12,
    letterSpacing: 3,
    color: "#E3A63E",
    fontWeight: "bold",
    marginTop: 8,
  },
  cancelCountdownBtn: {
    marginTop: 18,
    background: "rgba(255,255,255,0.2)",
    border: "1px solid #fff",
    color: "#fff",
    borderRadius: 20,
    padding: "6px 14px",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
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
    fontWeight: "bold",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
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
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 10,
    padding: "4px 9px",
    borderRadius: 10,
    backdropFilter: "blur(4px)",
  },
  errorFallbackContainer: {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    textAlign: "center",
    background: "#24201D",
    color: "#FFFDF8",
    boxSizing: "border-box",
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  fallbackTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 15,
    margin: "0 0 6px",
    color: "#F6F1E7",
  },
  fallbackDesc: {
    fontSize: 11,
    color: "#C9C2B4",
    margin: "0 0 14px",
    lineHeight: 1.4,
    maxWidth: 340,
  },
  fallbackActions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxWidth: 280,
  },
  btnPrimarySmall: {
    background: "#D8482E",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 14px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnSecondarySmall: {
    background: "#3E7C6B",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 14px",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnOutlineSmall: {
    background: "transparent",
    color: "#F6F1E7",
    border: "1px dashed #C9C2B4",
    borderRadius: 8,
    padding: "9px 14px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  },
  shutterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(16px, 6vw, 32px)",
    margin: "8px 0 12px",
  },
  shutterBtn: {
    position: "relative",
    width: 68,
    height: 68,
    borderRadius: "50%",
    background: "#D8482E",
    border: "4px solid #1E1A16",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(216,72,46,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  shutterCounting: {
    background: "#3E7C6B",
    borderColor: "#1E1A16",
  },
  shutterCountdownText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  shutterTimerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    background: "#1E1A16",
    color: "#E3A63E",
    fontSize: 9,
    padding: "2px 5px",
    borderRadius: 8,
    fontWeight: "bold",
    border: "1px solid #fff",
  },
  sideControlBtn: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#FFFDF8",
    border: "2px solid #1E1A16",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },
  thumbArea: {
    marginBottom: 10,
  },
  thumbHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  thumbLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#8A8073",
  },
  inlineDemoBtn: {
    background: "transparent",
    border: "1px dashed #3E7C6B",
    color: "#3E7C6B",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 9,
    cursor: "pointer",
    fontWeight: "bold",
  },
  thumbStrip: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 6,
    minHeight: 64,
  },
  thumbItem: {
    position: "relative",
    flex: "0 0 auto",
    width: 62,
    height: 62,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 6,
    border: "1.5px solid #1E1A16",
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
    textAlign: "center",
  },
  thumbNum: {
    position: "absolute",
    bottom: 2,
    left: 2,
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 8,
    padding: "1px 4px",
    borderRadius: 3,
  },
  emptyThumbHint: {
    fontSize: 11,
    color: "#8A8073",
    padding: "18px 0",
    textAlign: "center",
    width: "100%",
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
  btnDisabled: {
    background: "#D9D2C2",
    color: "#8A8073",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};
