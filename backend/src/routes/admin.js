const express = require("express");
const db = require("../db");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/token");

const router = express.Router();

// Resolve the 'org_admin' role id once at startup.
const ORG_ADMIN_ROLE = db.prepare("SELECT id FROM roles WHERE name = ?").get("org_admin");

// POST /api/admin/signup - register an org-admin using the org's admin code.
router.post("/signup", (req, res) => {
  const { email, password, signupCode } = req.body || {};
  if (!email || !password || !signupCode) {
    return res.status(400).json({ error: "email, password, and signupCode are required" });
  }
  // The code alone identifies the org AND proves admin-level authorization.
  const org = db.prepare("SELECT id FROM organizations WHERE admin_code = ?").get(signupCode);
  if (!org) {
    return res.status(403).json({ error: "Invalid signup code." });
  }
  try {
    db.prepare("INSERT INTO users (email, password_hash, role_id, org_id) VALUES (?, ?, ?, ?)")
      .run(email.trim(), hashPassword(password), ORG_ADMIN_ROLE.id, org.id);
    res.status(201).json({ message: "Signup successful. Please log in." });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "A user with that email already exists" });
    }
    throw err;
  }
});

// POST /api/admin/login - authenticate an existing org-admin, issue a token.
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
  if (user.role !== "org_admin") {
    return res.status(403).json({ error: "Not an organization admin account" });
  }

  // orgName rides along for display; orgId stays the thing used for authorization.
  res.json({ token: signToken({ userId: user.id, role: user.role, orgId: user.org_id, orgName: user.org_name }) });
});
module.exports = router;