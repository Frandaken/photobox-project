/**
 * Sticker = elemen dekoratif yang bisa ditempel bebas oleh user di atas
 * hasil komposisi akhir (satu lapisan global, bukan per-foto).
 *
 * src di sini pakai data URL SVG inline sebagai placeholder sederhana
 * (emoji-style), supaya tidak perlu file gambar eksternal dulu.
 * Nanti admin bisa upload PNG stiker sendiri lewat panel admin.
 */
function svgSticker(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <text x="100" y="130" font-size="140" text-anchor="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const STICKERS = [
  { id: "heart", name: "Hati", src: svgSticker("❤️") },
  { id: "star", name: "Bintang", src: svgSticker("⭐") },
  { id: "sparkle", name: "Kilau", src: svgSticker("✨") },
  { id: "flower", name: "Bunga", src: svgSticker("🌸") },
  { id: "camera", name: "Kamera", src: svgSticker("📷") },
  { id: "smile", name: "Senyum", src: svgSticker("😊") },
];
