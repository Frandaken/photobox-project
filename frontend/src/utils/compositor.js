/**
 * compositor.js
 * Util untuk menggambar hasil gabungan Layout + Background + Foto ke canvas.
 * Dipakai bersama oleh layar StickerOverlay (preview live) dan proses
 * export akhir (final digital copy).
 */

/**
 * Menggambar background sebagai lapisan dasar penuh kanvas.
 * Untuk versi awal, background berupa warna solid (thumbColor).
 * Nanti diganti gambar (bg.imageUrl) begitu admin bisa upload background.
 */
function drawBackground(ctx, background, canvasWidth, canvasHeight) {
  if (background?.imageUrl) {
    // TODO: load & drawImage saat background berbasis gambar sudah tersedia
  }
  ctx.fillStyle = background?.thumbColor ?? "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * Menggambar satu foto ke dalam slot dengan strategi "cover"
 * (mengisi penuh area slot, crop bagian yang lebih, tetap proporsional).
 */
function drawPhotoInSlot(ctx, img, slot) {
  const slotRatio = slot.width / slot.height;
  const imgRatio = img.width / img.height;

  let sx, sy, sWidth, sHeight;

  if (imgRatio > slotRatio) {
    // gambar lebih lebar dari slot -> crop kiri-kanan
    sHeight = img.height;
    sWidth = sHeight * slotRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    // gambar lebih tinggi dari slot -> crop atas-bawah
    sWidth = img.width;
    sHeight = sWidth / slotRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(
    img,
    sx, sy, sWidth, sHeight,
    slot.x, slot.y, slot.width, slot.height
  );
}

/**
 * Load satu dataURL/URL jadi HTMLImageElement.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Fungsi utama: render komposisi lengkap (background + foto-foto sesuai slot)
 * ke sebuah canvas berukuran layout.canvasWidth x layout.canvasHeight.
 *
 * @param {HTMLCanvasElement} canvas - target canvas untuk digambar
 * @param {object} layout - dari data/layouts.js, punya slots[] & canvasWidth/Height
 * @param {object} background - dari data/backgrounds.js
 * @param {string[]} photos - array dataURL foto, urutan sesuai urutan slots
 */
export async function renderComposition(canvas, layout, background, photos) {
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, background, layout.canvasWidth, layout.canvasHeight);

  const images = await Promise.all(photos.map((src) => loadImage(src)));

  layout.slots.forEach((slot, i) => {
    const img = images[i];
    if (img) drawPhotoInSlot(ctx, img, slot);
  });

  return canvas;
}

/**
 * Menggambar lapisan stiker (array of {src, x, y, scale, rotation})
 * di atas canvas yang sudah berisi komposisi dasar.
 * x, y adalah titik tengah stiker dalam koordinat kanvas asli (px),
 * scale adalah faktor pembesar dari ukuran asli gambar stiker.
 */
export async function drawStickers(canvas, stickers) {
  const ctx = canvas.getContext("2d");
  const images = await Promise.all(stickers.map((s) => loadImage(s.src)));

  stickers.forEach((sticker, i) => {
    const img = images[i];
    if (!img) return;
    const w = img.width * sticker.scale;
    const h = img.height * sticker.scale;

    ctx.save();
    ctx.translate(sticker.x, sticker.y);
    ctx.rotate((sticker.rotation ?? 0) * (Math.PI / 180));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  });

  return canvas;
}

/**
 * Ekspor canvas jadi dataURL JPEG siap didownload/diupload.
 */
export function canvasToDataUrl(canvas, quality = 0.92) {
  return canvas.toDataURL("image/jpeg", quality);
}
