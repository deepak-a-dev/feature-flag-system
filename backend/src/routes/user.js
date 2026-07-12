const express = require("express");
const db = require("../db");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/token");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

const END_USER_ROLE = db.prepare("SELECT id FROM roles WHERE name = ?").get("end_user");

// POST /api/user/signup — register an end user via the org's USER code.
router.post("/signup", (req, res) => {
  const { email, password, signupCode } = req.body || {};
  if (!email || !password || !signupCode) {
    return res.status(400).json({ error: "email, password, and signupCode are required" });
  }
  // Looks up by user_code — so an ADMIN code won't work here, and vice-versa.
  const org = db.prepare("SELECT id FROM organizations WHERE user_code = ?").get(signupCode);
  if (!org) {
    return res.status(403).json({ error: "Invalid signup code." });
  }
  try {
    db.prepare("INSERT INTO users (email, password_hash, role_id, org_id) VALUES (?, ?, ?, ?)")
      .run(email.trim(), hashPassword(password), END_USER_ROLE.id, org.id);
    res.status(201).json({ message: "Signup successful. Please log in." });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "A user with that email already exists" });
    }
    throw err;
  }
});

// POST /api/user/login — authenticate an end user, issue a token.
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = db
    .prepare(
      `SELECT u.id, u.password_hash, u.org_id, r.name AS role, o.name AS org_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         JOIN organizations o ON o.id = u.org_id
        WHERE u.email = ?`
    )
    .get(email.trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.role !== "end_user") {
    return res.status(403).json({ error: "Not an end-user account" });
  }
  res.json({ token: signToken({ userId: user.id, role: user.role, orgId: user.org_id, orgName: user.org_name }) });
});

// POST /api/user/features/check — is a feature enabled for the caller's org?
router.post("/features/check", authenticate, requireRole("end_user"), (req, res) => {
  const { key } = req.body || {};
  if (!key || !key.trim()) {
    return res.status(400).json({ error: "Feature flag key is required" });
  }
  const flag = db
    .prepare("SELECT enabled FROM feature_flags WHERE org_id = ? AND key = ?")
    .get(req.user.orgId, key.trim());
  // Unknown flag => disabled. Safe default, matching how real flag SDKs behave.
  res.json({ key: key.trim(), enabled: flag ? Boolean(flag.enabled) : false });
});

// GET /api/user/me — validates the token server-side and returns identity.
// The frontend calls this on load; a 401 means the token is expired/invalid.
router.get("/me", authenticate, requireRole("end_user"), (req, res) => {
  res.json({ userId: req.user.userId, orgId: req.user.orgId, orgName: req.user.orgName });
});

module.exports = router;