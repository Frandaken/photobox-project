import crypto from "crypto";

/**
 * adminAuth.js
 * Autentikasi sederhana berbasis PIN (dari env ADMIN_PIN) untuk Admin Panel.
 * Tidak pakai library auth penuh karena kebutuhannya sangat sederhana:
 * satu PIN bersama untuk staf yang mengelola kios, bukan multi-user.
 *
 * Setelah PIN benar, backend menerbitkan token acak yang disimpan di memori
 * (cukup untuk satu sesi kios; kalau backend restart, admin perlu login PIN
 * lagi — ini bukan masalah karena PIN gampang diketik ulang).
 */

const activeTokens = new Set();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 4; // 4 jam

export function verifyPin(inputPin) {
  const correctPin = process.env.ADMIN_PIN;
  if (!correctPin) {
    // Kalau admin belum set PIN di env, admin panel dianggap tidak boleh
    // diakses sama sekali (fail-safe: lebih baik terkunci daripada terbuka).
    return null;
  }
  if (String(inputPin) !== String(correctPin)) return null;

  const token = crypto.randomBytes(24).toString("hex");
  activeTokens.add(token);
  setTimeout(() => activeTokens.delete(token), TOKEN_TTL_MS);
  return token;
}

export function isValidToken(token) {
  return Boolean(token) && activeTokens.has(token);
}

/**
 * Express middleware: cek header "Authorization: Bearer <token>"
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!isValidToken(token)) {
    return res.status(401).json({ error: "Tidak terautentikasi" });
  }
  next();
}
