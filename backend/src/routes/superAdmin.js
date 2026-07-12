const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { signToken } = require("../utils/token");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/superadmin/login
// Authenticates against static .env credentials. No DB lookup - the super
// admin is a config-based system operator, not a tenant user.
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const ok =
    email === process.env.SUPER_ADMIN_EMAIL &&
    password === process.env.SUPER_ADMIN_PASSWORD;
  if (!ok) {
    return res.status(401).json({ error: "Invalid super admin credentials" });
  }
  res.json({ token: signToken({ role: "super_admin" }) });
});


// Everything below this requires a valid super_admin token.
// (router.use applies to routes declared AFTER it, so /login stays public.)
router.use(authenticate, requireRole("super_admin"));

// POST /api/superadmin/orgs - create an organization + generate 2 codes
router.post("/orgs", (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Organization name is required" });
  }
  // Random shared invite code the super admin distributes to that org's admins.
  const adminCode = crypto.randomBytes(6).toString("hex"); // 12 hex chars for admin signup
  const userCode = crypto.randomBytes(6).toString("hex"); // 12 hex chars for user signup
  try {
    const info = db
      .prepare("INSERT INTO organizations (name, admin_code, user_code) VALUES (?, ?, ?)")
      .run(name.trim(), adminCode, userCode);
    const org = db
      .prepare("SELECT id, name, admin_code, user_code, created_at FROM organizations WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(org);
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "An organization with that name already exists" });
    }
    throw err;
  }
});


// GET /api/superadmin/orgs - list all organizations (admin_code and user_code)
router.get("/orgs", (req, res) => {
  const orgs = db
    .prepare("SELECT id, name, admin_code, user_code, created_at FROM organizations ORDER BY id")
    .all();
  res.json(orgs);
});

module.exports = router;