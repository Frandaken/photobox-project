import React, { useState, useEffect } from "react";
import IdleScreen from "./components/IdleScreen.jsx";
import LayoutPicker from "./components/LayoutPicker.jsx";
import BackgroundPicker from "./components/BackgroundPicker.jsx";
import PhotoSession from "./components/PhotoSession.jsx";
import SelectBest from "./components/SelectBest.jsx";
import StickerOverlay from "./components/StickerOverlay.jsx";
import DigitalCopy from "./components/DigitalCopy.jsx";
import Done from "./components/Done.jsx";
import AdminLockButton from "./components/AdminLockButton.jsx";

const AdminPanel = React.lazy(() => import("./components/AdminPanel.jsx"));

/**
 * App
 * State machine untuk alur photobox lengkap:
 *
 * idle -> layout -> background -> session -> selectBest
 *      -> stickers -> digitalCopy -> done -> (kembali ke idle)
 *
 * Semua data sesi (layout terpilih, background terpilih, foto mentah,
 * foto pilihan, stiker, hasil akhir) disimpan di state App ini dan
 * diteruskan sebagai props ke tiap layar, supaya satu sumber kebenaran
 * (single source of truth).
 *
 * Admin Panel ditumpuk di atas semua layar (overlay gembok pojok kanan
 * atas, selalu terlihat) dan tidak terikat pada state machine screen di atas.
 */
export default function App() {
  const [screen, setScreen] = useState("idle");

  const [selectedLayout, setSelectedLayout] = useState(null);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [rawPhotos, setRawPhotos] = useState([]); // semua hasil jepretan sesi
  const [chosenPhotos, setChosenPhotos] = useState([]); // subset yang dipilih, sejumlah slot layout
  const [placedStickers, setPlacedStickers] = useState([]);
  const [finalDataUrl, setFinalDataUrl] = useState(null); // hasil akhir untuk print
  const [shareUrl, setShareUrl] = useState(null); // URL share Nextcloud view-only
  const [sessionName, setSessionName] = useState(null); // misal "SESI 230426 193326"

  const [adminToken, setAdminToken] = useState(null); // null = admin panel tertutup

  const resetSession = () => {
    setSelectedLayout(null);
    setSelectedBackground(null);
    setRawPhotos([]);
    setChosenPhotos([]);
    setPlacedStickers([]);
    setFinalDataUrl(null);
    setShareUrl(null);
    setSessionName(null);
    setScreen("idle");
  };

  // Inactivity timeout untuk photobox kiosk (kembali ke idle jika ditinggal)
  useEffect(() => {
    if (screen === "idle" || adminToken) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 150 detik tanpa aktivitas -> kembali ke idle
      timeoutId = setTimeout(() => {
        resetSession();
      }, 150000);
    };

    const events = ["mousedown", "touchstart", "keydown", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [screen, adminToken]);

  const handlePrint = () => {
    window.print();
  };

  const renderScreen = () => {
    switch (screen) {
      case "idle":
        return <IdleScreen onStart={() => setScreen("layout")} />;

      case "layout":
        return (
          <LayoutPicker
            onSelect={(layout) => {
              setSelectedLayout(layout);
              setScreen("background");
            }}
            onBack={() => setScreen("idle")}
          />
        );

      case "background":
        return (
          <BackgroundPicker
            onSelect={(bg) => {
              setSelectedBackground(bg);
              setScreen("session");
            }}
            onBack={() => setScreen("layout")}
          />
        );

      case "session":
        return (
          <PhotoSession
            requiredShots={selectedLayout?.requiredShots ?? 1}
            onFinish={(photos) => {
              setRawPhotos(photos);
              setScreen("selectBest");
            }}
            onBack={() => setScreen("background")}
          />
        );

      case "selectBest":
        return (
          <SelectBest
            allPhotos={rawPhotos}
            requiredShots={selectedLayout?.requiredShots ?? 1}
            layout={selectedLayout}
            background={selectedBackground}
            onConfirm={(photos) => {
              setChosenPhotos(photos);
              setScreen("stickers");
            }}
            onTakeMore={() => setScreen("session")}
            onBack={() => setScreen("session")}
          />
        );

      case "stickers":
        return (
          <StickerOverlay
            layout={selectedLayout}
            background={selectedBackground}
            photos={chosenPhotos}
            onConfirm={(stickers) => {
              setPlacedStickers(stickers);
              setScreen("digitalCopy");
            }}
            onBack={() => setScreen("selectBest")}
          />
        );

      case "digitalCopy":
        return (
          <DigitalCopy
            layout={selectedLayout}
            background={selectedBackground}
            chosenPhotos={chosenPhotos}
            stickers={placedStickers}
            allOriginalPhotos={rawPhotos}
            onDone={(dataUrl, nextcloudShareUrl, name) => {
              setFinalDataUrl(dataUrl);
              if (nextcloudShareUrl) setShareUrl(nextcloudShareUrl);
              if (name) setSessionName(name);
              setScreen("done");
            }}
            onBack={() => setScreen("stickers")}
          />
        );

      case "done":
        return (
          <Done
            finalDataUrl={finalDataUrl}
            shareUrl={shareUrl}
            sessionName={sessionName}
            onPrint={handlePrint}
            onFinish={resetSession}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderScreen()}

      {adminToken ? (
        <React.Suspense
          fallback={
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(30, 26, 22, 0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFDF8",
                fontFamily: "Georgia, serif",
                fontSize: 16,
                zIndex: 9999,
              }}
            >
              Memuat Admin Panel…
            </div>
          }
        >
          <AdminPanel token={adminToken} onClose={() => setAdminToken(null)} />
        </React.Suspense>
      ) : (
        <AdminLockButton onUnlock={setAdminToken} />
      )}
    </>
  );
}
