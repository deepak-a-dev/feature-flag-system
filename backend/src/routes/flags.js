const express = require("express");
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// SQLite stores booleans as 0/1 - map to real JSON booleans at the API edge.
function serializeFlag(row) {
  return { ...row, enabled: Boolean(row.enabled) };
}

// Every flag route requires an authenticated org admin.
router.use(authenticate, requireRole("org_admin"));

// POST /api/admin/flags - create a flag in the CALLER'S org.
router.post("/", (req, res) => {
  const { key, enabled } = req.body || {};
  if (!key || !key.trim()) {
    return res.status(400).json({ error: "Feature flag key is required" });
  }
  const orgId = req.user.orgId;                 // <-- from the token, not the body
  try {
    const info = db
      .prepare("INSERT INTO feature_flags (org_id, key, enabled) VALUES (?, ?, ?)")
      .run(orgId, key.trim(), enabled ? 1 : 0);
    const flag = db
      .prepare("SELECT id, key, enabled, created_at, updated_at FROM feature_flags WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(serializeFlag(flag));
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "A flag with that key already exists for this organization" });
    }
    throw err;
  }
});

// GET /api/admin/flags - list ONLY the caller's org's flags.
router.get("/", (req, res) => {
  const flags = db
    .prepare("SELECT id, key, enabled, created_at, updated_at FROM feature_flags WHERE org_id = ? ORDER BY id")
    .all(req.user.orgId);
  res.json(flags.map(serializeFlag));
});

// PATCH /api/admin/flags/:key - enable/disable a flag in the caller's org.
router.patch("/:key", (req, res) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "'enabled' (boolean) is required" });
  }
  // The WHERE clause scopes to org_id - so you can only ever update YOUR org's flag.
  const info = db
    .prepare("UPDATE feature_flags SET enabled = ?, updated_at = datetime('now', '+5 hours', '30 minutes') WHERE org_id = ? AND key = ?")
    .run(enabled ? 1 : 0, req.user.orgId, req.params.key);

  if (info.changes === 0) {
    return res.status(404).json({ error: "Flag not found for this organization" });
  }
  const flag = db
    .prepare("SELECT id, key, enabled, created_at, updated_at FROM feature_flags WHERE org_id = ? AND key = ?")
    .get(req.user.orgId, req.params.key);
  res.json(serializeFlag(flag));
});

// DELETE /api/admin/flags/:key - remove a flag from the caller's org.
router.delete("/:key", (req, res) => {
  const info = db
    .prepare("DELETE FROM feature_flags WHERE org_id = ? AND key = ?")
    .run(req.user.orgId, req.params.key);

  if (info.changes === 0) {
    return res.status(404).json({ error: "Flag not found for this organization" });
  }
  res.json({ message: "Flag deleted" });
});

module.exports = router;