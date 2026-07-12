const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Open (or create on first run) the database file in the backend root.
// It's gitignored (*.db), so it never gets committed.
const dbPath = path.join(__dirname, "..", "..", "data.db");
const db = new Database(dbPath);

// CRITICAL: SQLite disables foreign-key enforcement by default, and it must
// be turned on per connection. Without this, our REFERENCES constraints
// would be silently ignored. (Common gotcha - good to know.)
db.pragma("foreign_keys = ON");

// Apply the schema. CREATE TABLE IF NOT EXISTS makes this safe to run every
// startup - existing tables are left untouched.
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Seed the two tenant roles. INSERT OR IGNORE is idempotent: if the role
// already exists (UNIQUE name), it's skipped rather than erroring.
const insertRole = db.prepare("INSERT OR IGNORE INTO roles (name) VALUES (?)");
for (const roleName of ["org_admin", "end_user"]) {
  insertRole.run(roleName);
}

module.exports = db;