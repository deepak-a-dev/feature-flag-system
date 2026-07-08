const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
// Token lifetime is environment-driven: short (e.g. 2m) to demo expiry,
// longer (e.g. 8h) for normal use. Falls back to 8h if unset.
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "8h";

// Create a signed JWT carrying identity + tenant. orgId lives IN the token,
// so a user can never act on an org other than their own via a forged body.
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Verify signature + expiry. Throws if invalid/expired; middleware turns
// that into a 401.
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };