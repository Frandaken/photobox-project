import crypto from "crypto";

/**
 * adminAuth.js
 * Autentikasi sederhana berbasis PIN (dari env ADMIN_PIN) untuk Admin Panel.
 */

const activeTokens = new Set();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 4; // 4 jam

export function verifyPin(inputPin) {
  const envPin = (process.env.ADMIN_PIN || "").trim();
  const input = String(inputPin || "").trim();

  if (!input) return null;

  // Jika ADMIN_PIN diatur di env, HANYA PIN tersebut yang diizinkan (blokir 1234 / 123456 dan lainnya)
  let isMatch = false;
  if (envPin) {
    isMatch = input === envPin;
  } else {
    // Hanya jika variabel ADMIN_PIN tidak diatur di env sama sekali, gunakan fallback 1234
    isMatch = input === "1234";
  }

  if (!isMatch) return null;

  const token = crypto.randomBytes(24).toString("hex");
  activeTokens.add(token);
  const timer = setTimeout(() => activeTokens.delete(token), TOKEN_TTL_MS);
  if (timer.unref) timer.unref();
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
