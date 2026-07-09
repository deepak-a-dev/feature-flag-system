const express = require("express");
const db = require("../db");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/token");

const router = express.Router();

// Resolve the 'org_admin' role id once at startup.
const ORG_ADMIN_ROLE = db.prepare("SELECT id FROM roles WHERE name = ?").get("org_admin");

// POST /api/admin/signup — register an org-admin using the org's shared code.
router.post("/signup", (req, res) => {
  const { email, password, orgName, signupCode } = req.body || {};
  if (!email || !password || !orgName || !signupCode) {
    return res.status(400).json({ error: "email, password, orgName, and signupCode are required" });
  }

  const org = db
    .prepare("SELECT id, signup_code FROM organizations WHERE name = ?")
    .get(orgName.trim());
  if (!org) {
    return res.status(400).json({ error: "Organization does not exist." });
  }
  // Gate signup behind the org's invite code — closes the open-signup hole.
  if (signupCode !== org.signup_code) {
    return res.status(403).json({ error: "Invalid signup code for this organization." });
  }

  try {
    db.prepare(
      "INSERT INTO users (email, password_hash, role_id, org_id) VALUES (?, ?, ?, ?)"
    ).run(email.trim(), hashPassword(password), ORG_ADMIN_ROLE.id, org.id);

    // No auto-login — account created, admin must log in separately.
    res.status(201).json({ message: "Signup successful. Please log in." });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "A user with that email already exists" });
    }
    throw err;
  }
});

// POST /api/admin/login — authenticate an existing org-admin, issue a token.
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db
    .prepare(
      `SELECT u.id, u.password_hash, u.org_id, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.email = ?`
    )
    .get(email.trim());

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.role !== "org_admin") {
    return res.status(403).json({ error: "Not an organization admin account" });
  }

  res.json({ token: signToken({ userId: user.id, role: user.role, orgId: user.org_id }) });
});

module.exports = router;