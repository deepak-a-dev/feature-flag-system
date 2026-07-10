-- ORGANIZATIONS: the tenants. Everything else hangs off these.
CREATE TABLE IF NOT EXISTS organizations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  admin_code  TEXT NOT NULL UNIQUE,
  user_code   TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ROLES: reference table. Seeded with 'org_admin' and 'end_user'.
CREATE TABLE IF NOT EXISTS roles (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- USERS: people who belong to exactly one org (admins and end users).
-- Super admin is NOT here (it's config-based).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  org_id        INTEGER NOT NULL REFERENCES organizations(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- FEATURE_FLAGS: each flag belongs to one org. Same key can exist in
-- different orgs, but only once per org — that's the tenant isolation.
CREATE TABLE IF NOT EXISTS feature_flags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id     INTEGER NOT NULL REFERENCES organizations(id),
  key        TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (org_id, key)
);