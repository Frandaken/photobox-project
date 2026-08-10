import fs from "fs/promises";
import path from "path";

/**
 * dataStore.js
 * Penyimpanan sederhana berbasis file JSON untuk data Layout & Background
 * yang dikelola lewat Admin Panel. Disimpan di /app/data (di-mount sebagai
 * volume Docker supaya perubahan admin tidak hilang saat container di-rebuild).
 *
 * Kalau file belum ada (instalasi baru), otomatis diisi dengan data contoh
 * yang sama seperti yang tadinya hardcode di frontend.
 */

const DATA_DIR = process.env.DATA_DIR || "/app/data";
const LAYOUTS_FILE = path.join(DATA_DIR, "layouts.json");
const BACKGROUNDS_FILE = path.join(DATA_DIR, "backgrounds.json");

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

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonOrDefault(filePath, defaultValue) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") {
      await ensureDataDir();
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    throw err;
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
