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

  // Cocok dengan env ADMIN_PIN, atau fallback default pin 1234 / 123456
  const isMatch =
    (envPin && input === envPin) ||
    input === "1234" ||
    input === "123456";

  if (!isMatch) return null;

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
