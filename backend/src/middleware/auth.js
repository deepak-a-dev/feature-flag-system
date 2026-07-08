const { verifyToken } = require("../utils/token");

// AUTHENTICATION: "who are you?"
// Reads the Bearer token, verifies it, and attaches the decoded identity
// to req.user so downstream handlers can trust { userId, role, orgId }.
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    req.user = verifyToken(token); // { userId, role, orgId, iat, exp }
    next();                        // token valid — proceed to the route
  } catch (err) {
    // Covers bad signature AND expired token (jwt.verify throws for both)
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// AUTHORIZATION: "are you allowed?"
// A middleware *factory* — returns a guard that only lets through users whose
// role is in the allowed list. Must run AFTER authenticate (needs req.user).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };