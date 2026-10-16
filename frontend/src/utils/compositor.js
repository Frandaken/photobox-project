/**
 * compositor.js
 * Util untuk merender hasil gabungan Layout + Frame Overlay + Background + Foto ke canvas.
 * Dipakai bersama oleh:
 * - SelectBest (preview live frame saat memilih foto)
 * - StickerOverlay (preview live + penempatan stiker)
 * - DigitalCopy (render final digital resolution untuk export & print)
 * - AdminPanel (preview layout & slot saat mengedit frame)
 */

/**
 * Load satu dataURL/URL jadi HTMLImageElement secara asinkron.
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Gagal memuat gambar:", src?.slice?.(0, 50));
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Menggambar background sebagai lapisan dasar kanvas.
 */
async function drawBackground(ctx, background, layout, canvasWidth, canvasHeight) {
  const bgImgUrl = background?.imageUrl || layout?.frameBackgroundUrl;

  if (bgImgUrl) {
    try {
      const bgImg = await loadImage(bgImgUrl);
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        return;
      }
    } catch {
      // Fallback ke warna
    }
  }

  ctx.fillStyle = background?.thumbColor ?? "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * Menggambar satu foto ke dalam slot dengan strategi "cover"
 * (mengisi penuh area slot, crop bagian lebih, proporsional).
 */
export function drawPhotoInSlot(ctx, img, slot) {
  if (!img) return;

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

  ctx.save();
  // Jika slot memiliki radius sudut rounded
  if (slot.borderRadius) {
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.width, slot.height, slot.borderRadius);
    ctx.clip();
  }

  ctx.drawImage(
    img,
    sx,
    sy,
    sWidth,
    sHeight,
    slot.x,
    slot.y,
    slot.width,
    slot.height
  );
  ctx.restore();
}

/**
 * Menggambar placeholder untuk slot kosong saat preview (misal di SelectBest).
 */
function drawEmptySlotPlaceholder(ctx, slot, index) {
  ctx.save();
  ctx.fillStyle = "rgba(62, 124, 107, 0.08)";
  ctx.fillRect(slot.x, slot.y, slot.width, slot.height);

  ctx.strokeStyle = "#3E7C6B";
  ctx.lineWidth = Math.max(2, Math.round(slot.width * 0.006));
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

  const label = slot.label || `Foto ${index + 1}`;
  const fontSize = Math.max(16, Math.round(slot.width * 0.07));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "#3E7C6B";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, slot.x + slot.width / 2, slot.y + slot.height / 2);

  ctx.restore();
}

/**
 * Fungsi utama: render komposisi lengkap:
 * 1. Background (warna / gambar dasar)
 * 2. Foto-foto sesuai slot
 * 3. Frame Overlay (jika ada file frame PNG transparan di atas foto)
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} layout
 * @param {object} background
 * @param {string[]} photos - array foto dataURL
 * @param {object} options - { showPlaceholders: boolean }
 */
export async function renderComposition(
  canvas,
  layout,
  background,
  photos = [],
  options = {}
) {
  if (!canvas || !layout) return canvas;

  canvas.width = layout.canvasWidth || 1200;
  canvas.height = layout.canvasHeight || 1800;
  const ctx = canvas.getContext("2d");

  // 1. Lapisan Background
  await drawBackground(ctx, background, layout, canvas.width, canvas.height);

  // 2. Load foto dan gambar ke slot
  const validPhotos = photos || [];
  const loadedPhotos = await Promise.all(
    validPhotos.map((src) => (src ? loadImage(src) : Promise.resolve(null)))
  );

  (layout.slots || []).forEach((slot, i) => {
    const img = loadedPhotos[i];
    if (img) {
      drawPhotoInSlot(ctx, img, slot);
    } else if (options.showPlaceholders) {
      drawEmptySlotPlaceholder(ctx, slot, i);
    }
  });

  // 3. Lapisan Frame Overlay (PNG frame template di atas foto)
  if (layout.frameOverlayUrl) {
    try {
      const overlayImg = await loadImage(layout.frameOverlayUrl);
      if (overlayImg) {
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
      }
    } catch (err) {
      console.warn("Gagal merender frame overlay:", err);
    }
  }

  return canvas;
}

/**
 * Menggambar lapisan stiker di atas canvas
 */
export async function drawStickers(canvas, stickers = []) {
  if (!canvas || !stickers.length) return canvas;
  const ctx = canvas.getContext("2d");
  const images = await Promise.all(stickers.map((s) => loadImage(s.src)));

  stickers.forEach((sticker, i) => {
    const img = images[i];
    if (!img) return;
    const w = img.width * (sticker.scale || 1);
    const h = img.height * (sticker.scale || 1);

    ctx.save();
    ctx.translate(sticker.x, sticker.y);
    ctx.rotate(((sticker.rotation ?? 0) * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  });

  return canvas;
}

/**
 * Ekspor canvas jadi dataURL JPEG siap didownload/diupload.
 */
export function canvasToDataUrl(canvas, quality = 0.95) {
  return canvas.toDataURL("image/jpeg", quality);
}
