/**
 * Layout = struktur/posisi slot foto di dalam kanvas cetak.
 * Terpisah dari Background (tema visual) — keduanya digabung saat compositing.
 *
 * canvasWidth/canvasHeight dalam px, bebas ditentukan admin per layout
 * (tidak terikat ukuran kertas fisik tertentu).
 *
 * slots: posisi & ukuran tiap foto di dalam kanvas, urutan array = urutan
 * pengisian foto (slot pertama diisi foto pertama yang dipilih user, dst).
 */
export const LAYOUTS = [
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

export function getLayoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? null;
}
