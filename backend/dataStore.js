import fs from "fs/promises";
import path from "path";

/**
 * dataStore.js
 * Penyimpanan sederhana berbasis file JSON untuk data Layout, Background, dan Stiker
 * yang dikelola lewat Admin Panel. Disimpan di /app/data (di-mount sebagai
 * volume Docker supaya perubahan admin tidak hilang saat container di-rebuild).
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const LAYOUTS_FILE = path.join(DATA_DIR, "layouts.json");
const BACKGROUNDS_FILE = path.join(DATA_DIR, "backgrounds.json");
const STICKERS_FILE = path.join(DATA_DIR, "stickers.json");

const DEFAULT_LAYOUTS = [
  {
    id: "strip-3",
    name: "Strip Vertikal",
    paperHint: "2x6 Strip",
    canvasWidth: 600,
    canvasHeight: 1800,
    requiredShots: 3,
    slots: [
      { x: 40, y: 40, width: 520, height: 520 },
      { x: 40, y: 600, width: 520, height: 520 },
      { x: 40, y: 1160, width: 520, height: 520 },
    ],
  },
  {
    id: "grid-4",
    name: "Grid Berempat",
    paperHint: "4R",
    canvasWidth: 1200,
    canvasHeight: 1800,
    requiredShots: 4,
    slots: [
      { x: 40, y: 40, width: 540, height: 540 },
      { x: 620, y: 40, width: 540, height: 540 },
      { x: 40, y: 620, width: 540, height: 540 },
      { x: 620, y: 620, width: 540, height: 540 },
    ],
  },
  {
    id: "solo-1",
    name: "Klasik Solo",
    paperHint: "3R",
    canvasWidth: 900,
    canvasHeight: 1200,
    requiredShots: 1,
    slots: [{ x: 60, y: 60, width: 780, height: 1080 }],
  },
  {
    id: "duo-2",
    name: "Duo Samping",
    paperHint: "4R",
    canvasWidth: 1600,
    canvasHeight: 1200,
    requiredShots: 2,
    slots: [
      { x: 40, y: 40, width: 740, height: 1120 },
      { x: 820, y: 40, width: 740, height: 1120 },
    ],
  },
];

const DEFAULT_BACKGROUNDS = [
  { id: "bg-cream", name: "Krem Polos", thumbColor: "#F6F1E7" },
  { id: "bg-mint", name: "Mint Segar", thumbColor: "#D7ECE4" },
  { id: "bg-film", name: "Merah Film", thumbColor: "#F3C9BE" },
  { id: "bg-navy", name: "Navy Elegan", thumbColor: "#232A3B" },
];

function svgToDataUrl(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const DEFAULT_STICKERS = [
  {
    id: "sparkles",
    name: "Sparkles",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <path d="M50 5 Q50 45 95 50 Q50 55 50 95 Q50 55 5 50 Q50 45 50 5Z" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
        <path d="M80 15 Q80 25 90 28 Q80 31 80 41 Q80 31 70 28 Q80 25 80 15Z" fill="#FBBF24"/>
        <path d="M22 65 Q22 75 32 78 Q22 81 22 91 Q22 81 12 78 Q22 75 22 65Z" fill="#FBBF24"/>
      </svg>
    `),
    aspectRatio: 1,
    width: 200,
    height: 200,
  },
  {
    id: "pink-heart",
    name: "Heart",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <path d="M50 85 C20 60 5 40 5 25 C5 12 15 5 28 5 C38 5 46 11 50 18 C54 11 62 5 72 5 C85 5 95 12 95 25 C95 40 80 60 50 85 Z" fill="#F43F5E" stroke="#BE123C" stroke-width="3"/>
        <ellipse cx="32" cy="22" rx="8" ry="4" transform="rotate(-30 32 22)" fill="#FDA4AF"/>
      </svg>
    `),
    aspectRatio: 1,
    width: 200,
    height: 200,
  },
  {
    id: "cute-star",
    name: "Star",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <polygon points="50,5 64,36 98,38 72,60 80,95 50,75 20,95 28,60 2,38 36,36" fill="#FDE047" stroke="#CA8A04" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="40" cy="46" r="3" fill="#854D0E"/>
        <circle cx="60" cy="46" r="3" fill="#854D0E"/>
        <path d="M43 56 Q50 62 57 56" stroke="#854D0E" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
    aspectRatio: 1,
    width: 200,
    height: 200,
  },
  {
    id: "ribbon-bow",
    name: "Ribbon Bow",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" fill="none">
        <path d="M60 50 C30 20 5 30 15 55 C25 80 50 60 60 50 Z" fill="#FB7185" stroke="#E11D48" stroke-width="3"/>
        <path d="M60 50 C90 20 115 30 105 55 C95 80 70 60 60 50 Z" fill="#FB7185" stroke="#E11D48" stroke-width="3"/>
        <path d="M55 55 Q40 85 25 95 Q40 80 50 60 Z" fill="#E11D48"/>
        <path d="M65 55 Q80 85 95 95 Q80 80 70 60 Z" fill="#E11D48"/>
        <ellipse cx="60" cy="50" rx="10" ry="8" fill="#F43F5E" stroke="#BE123C" stroke-width="2"/>
      </svg>
    `),
    aspectRatio: 1.2,
    width: 240,
    height: 200,
  },
  {
    id: "cat-ears",
    name: "Cat Ears",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" fill="none">
        <polygon points="10,55 35,5 60,55" fill="#1E293B" stroke="#0F172A" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="20,50 35,18 50,50" fill="#F472B6"/>
        <polygon points="60,55 85,5 110,55" fill="#1E293B" stroke="#0F172A" stroke-width="3" stroke-linejoin="round"/>
        <polygon points="70,50 85,18 100,50" fill="#F472B6"/>
      </svg>
    `),
    aspectRatio: 2,
    width: 260,
    height: 130,
  },
  {
    id: "daisy-flower",
    name: "Daisy",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
        <g fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2">
          <ellipse cx="50" cy="20" rx="9" ry="16"/>
          <ellipse cx="50" cy="80" rx="9" ry="16"/>
          <ellipse cx="20" cy="50" rx="16" ry="9"/>
          <ellipse cx="80" cy="50" rx="16" ry="9"/>
          <ellipse cx="29" cy="29" rx="10" ry="15" transform="rotate(-45 29 29)"/>
          <ellipse cx="71" cy="71" rx="10" ry="15" transform="rotate(-45 71 71)"/>
          <ellipse cx="71" cy="29" rx="10" ry="15" transform="rotate(45 71 29)"/>
          <ellipse cx="29" cy="71" rx="10" ry="15" transform="rotate(45 29 71)"/>
        </g>
        <circle cx="50" cy="50" r="14" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
      </svg>
    `),
    aspectRatio: 1,
    width: 200,
    height: 200,
  },
  {
    id: "retro-sunglasses",
    name: "Glasses",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 60" fill="none">
        <path d="M58 24 Q70 18 82 24" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
        <rect x="10" y="15" width="48" height="34" rx="10" fill="#0284C7" stroke="#0F172A" stroke-width="5"/>
        <line x1="18" y1="22" x2="30" y2="22" stroke="#7DD3FC" stroke-width="3" stroke-linecap="round"/>
        <rect x="82" y="15" width="48" height="34" rx="10" fill="#0284C7" stroke="#0F172A" stroke-width="5"/>
        <line x1="90" y1="22" x2="102" y2="22" stroke="#7DD3FC" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `),
    aspectRatio: 2.33,
    width: 280,
    height: 120,
  },
  {
    id: "gold-crown",
    name: "Crown",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" fill="none">
        <path d="M10 65 L15 25 L35 45 L50 15 L65 45 L85 25 L90 65 Z" fill="#F59E0B" stroke="#B45309" stroke-width="3" stroke-linejoin="round"/>
        <rect x="10" y="65" width="80" height="10" rx="3" fill="#D97706"/>
        <circle cx="15" cy="23" r="4" fill="#EF4444"/>
        <circle cx="50" cy="13" r="4" fill="#3B82F6"/>
        <circle cx="85" cy="23" r="4" fill="#10B981"/>
      </svg>
    `),
    aspectRatio: 1.25,
    width: 220,
    height: 176,
  },
  {
    id: "photobox-date",
    name: "Photobox Tag",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" fill="none">
        <rect x="2" y="2" width="116" height="36" rx="18" fill="#18181B" stroke="#FAFAFA" stroke-width="2"/>
        <text x="60" y="25" text-anchor="middle" fill="#FAFAFA" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="1">PHOTOBOX</text>
      </svg>
    `),
    aspectRatio: 3,
    width: 270,
    height: 90,
  },
];

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

async function readJsonOrDefault(filePath, defaultValue) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const trimmed = content?.trim();
    if (!trimmed) {
      await writeJson(filePath, defaultValue).catch(() => {});
      return defaultValue;
    }
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      // Jika file hanya berisi [] atau invalid, pulihkan default template
      await writeJson(filePath, defaultValue).catch(() => {});
      return defaultValue;
    }
    return parsed;
  } catch (err) {
    console.warn(`[DataStore] Menggunakan default untuk ${path.basename(filePath)}:`, err.message);
    await writeJson(filePath, defaultValue).catch(() => {});
    return defaultValue;
  }
}

async function writeJson(filePath, value) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

export async function getLayouts() {
  return readJsonOrDefault(LAYOUTS_FILE, DEFAULT_LAYOUTS);
}

export async function saveLayouts(layouts) {
  await writeJson(LAYOUTS_FILE, layouts);
  return layouts;
}

export async function getBackgrounds() {
  return readJsonOrDefault(BACKGROUNDS_FILE, DEFAULT_BACKGROUNDS);
}

export async function saveBackgrounds(backgrounds) {
  await writeJson(BACKGROUNDS_FILE, backgrounds);
  return backgrounds;
}

export async function getStickers() {
  return readJsonOrDefault(STICKERS_FILE, DEFAULT_STICKERS);
}

export async function saveStickers(stickers) {
  await writeJson(STICKERS_FILE, stickers);
  return stickers;
}

export async function resetDefaults(type = "all") {
  if (type === "all" || type === "layouts") {
    await writeJson(LAYOUTS_FILE, DEFAULT_LAYOUTS);
  }
  if (type === "all" || type === "backgrounds") {
    await writeJson(BACKGROUNDS_FILE, DEFAULT_BACKGROUNDS);
  }
  if (type === "all" || type === "stickers") {
    await writeJson(STICKERS_FILE, DEFAULT_STICKERS);
  }
  return {
    layouts: DEFAULT_LAYOUTS,
    backgrounds: DEFAULT_BACKGROUNDS,
    stickers: DEFAULT_STICKERS,
  };
}
