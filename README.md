# Multi-Tenant Feature Flag Management System

A small SaaS-style feature-flag platform with a Node.js/Express backend and three
role-specific frontends. A **Super Admin** creates organizations, **Organization Admins**
manage feature flags scoped to their own organization, and **End Users** check whether a
given feature is enabled for their organization.

The central design goal is **multi-tenancy**: every organization's users and flags are
strictly isolated from every other organization's.

---

## 🚀 Getting Started (local)

> Requires **Node.js 18+ (LTS)** and **npm**. **No database to install.** SQLite creates
> its file automatically on first run, and there are no migrations to run.

**Step 1.** Clone the repository and move into the backend folder:
```bash
git clone <your-repo-url>
cd feature-flag-system/backend
```

**Step 2.** Install dependencies (from the `feature-flag-system/backend` directory; Step 1 put you there):
```bash
npm install
```

**Step 3.** Set up the required **environment variables** by creating a `backend/.env` file
(see the [section below](#-environment-variables)).

**Step 4.** Start the app from the `backend/` directory:
```bash
npm run dev     # development (auto-restart via nodemon)
   (or)
npm start       # plain node
```

**Step 5.** Everything is served from `http://localhost:4000`: the API **and** all three
frontends:

| App | URL |
|-----|-----|
| Super-Admin console | http://localhost:4000/super-admin/ |
| Admin console | http://localhost:4000/admin/ |
| User console | http://localhost:4000/user/ |

Health check: [`http://localhost:4000/api/health`](http://localhost:4000/api/health).

> On first run, the SQLite database (`backend/data.db`) is created automatically, the schema
> is applied, and the two roles (`org_admin`, `end_user`) are seeded. Nothing to configure.

### 🔑 Environment variables

The app reads its config/secrets from a `backend/.env` file (loaded via `dotenv`).
`PORT` and `JWT_EXPIRES_IN` have sensible defaults; the rest you **must** set.

| Variable | Description | Required? |
|----------|-------------|-----------|
| `JWT_SECRET` | A 256-bit hex secret for signing JWTs (generate one; see below ⬇️) | **required** |
| `SUPER_ADMIN_EMAIL` | Super-admin login email (config-based; the super admin is **not** a DB user) | **required** |
| `SUPER_ADMIN_PASSWORD` | Super-admin login password | **required** |
| `PORT` | Port the server listens on | optional (default `4000`) |
| `JWT_EXPIRES_IN` | Access-token lifetime, `ms`-format (e.g. `2h`, `30m`, `90s`) | optional (default `8h`) |

Create `backend/.env` (this file is **gitignored** and must not be committed). Copy & paste the below code into .env file:

```
JWT_SECRET=<paste a generated secret here>
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=change-me
PORT=4000
JWT_EXPIRES_IN=2h
```

**How to generate a `JWT_SECRET`:** run one of the below, copy the output, and paste it into
the `JWT_SECRET` field.

```bash
# Node (cross-platform; you already have Node installed)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
```bash
# macOS / Linux (or Git Bash on Windows)
openssl rand -hex 32
```
```powershell
# Windows PowerShell
$b = [byte[]]::new(32); [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

### ▶️ Try it (quick smoke test)

There are two ways to exercise the system. Use **either** one.

**Option A: In the browser.** Open the three consoles above and follow the flow:
  1. Log into the **Super-Admin** console with your `.env` credentials, then create an
     organization. The console displays that org's two invite codes: an **admin code** and a
     **user code**. **Copy both** (you will paste them in the next steps).
  2. In the **Admin** console, click **Sign up**, enter an email and password, and **paste the
     org's admin code** into the invite-code field. Then log in and create/toggle/delete
     feature flags.
  3. In the **User** console, click **Sign up**, enter an email and password, and **paste the
     org's user code** into the invite-code field. Then log in and check whether a feature
     key is enabled for your organization.

> **About the invite codes:** signup is gated by a code. Each organization has two codes (an
> admin code and a user code); admins sign up with the admin code and end users with the user
> code. For *why* there are two codes and how they prevent one role from impersonating
> another, see [Authentication & Tenant Isolation](#-authentication--tenant-isolation) below.

> **About the endpoints:** for the complete list of API endpoints and which ones require
> authentication, see the [API Reference](#-api-reference) below.

**OR**

**Option B: Via REST Client.** Open [`backend/requests.http`](backend/requests.http) in VS
Code (install & open with the **REST Client** extension by Huachao Mao) and send the requests
top-to-bottom. It drives the whole API end-to-end, including the tenant-isolation and
privilege-escalation checks. Secrets are read from `.env` via `{{$dotenv ...}}`, so no
credentials live in the file.

---

## 🧱 Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js (LTS) | Required by the assignment |
| Framework | Express | Minimal and explicit; auth/middleware written by hand |
| Database | SQLite via `better-sqlite3` | Relational data with zero setup; a single portable file |
| Data access | Hand-written SQL | Transparent; every query is easy to read and reason about |
| Auth | Custom JWT (`jsonwebtoken`) + `bcryptjs` | No third-party auth provider; tokens carry `orgId` for tenant scoping |
| Frontend | Plain HTML/CSS/JS | No build step; keeps focus on the backend |

No ORM and no third-party auth provider are used, per the assignment constraints.

---

## 📁 Project Structure

```
feature-flag-system/
├── backend/
│   ├── src/
│   │   ├── db/            # SQLite connection, schema, role seeding
│   │   ├── middleware/    # authenticate + requireRole
│   │   ├── routes/        # superAdmin, admin, flags, user route modules
│   │   ├── utils/         # password hashing, JWT sign/verify
│   │   ├── app.js         # Express app wiring (routes + static frontends)
│   │   └── server.js      # HTTP server entry point
│   ├── requests.http      # REST Client suite exercising the whole API
│   ├── .env               # secrets/config (gitignored)
│   ├── package.json
│   └── data.db            # SQLite database; auto-created on first `npm run` (gitignored)
└── frontend/
    ├── super-admin/       # create/list organizations
    ├── admin/             # signup, login, flag management
    └── user/              # signup, login, feature check
```

---

## 👥 Roles

| Role | Authentication | Capabilities |
|------|----------------|--------------|
| **Super Admin** | Static credentials in `.env` (not a DB user) | Log in, create organizations, list organizations |
| **Org Admin** | DB user; signs up with the org's admin code | Log in, create/enable/disable/delete flags for **their** org |
| **End User** | DB user; signs up with the org's user code | Log in, check whether a feature is enabled for **their** org |

---

## 🗄️ Data Model

Four persisted entities: **organizations**, **roles**, **users**, **feature_flags**.

```
organizations (id, name UNIQUE, admin_code UNIQUE, user_code UNIQUE, created_at)
roles         (id, name UNIQUE)                       -- 'org_admin', 'end_user'
users         (id, email UNIQUE, password_hash, role_id -> roles, org_id -> organizations, created_at)
feature_flags (id, org_id -> organizations, key, enabled, created_at, updated_at,
               UNIQUE(org_id, key))
```

### Entity-Relationship Diagram

```
                +-------------------------+
                |      organizations      |
                |  id (PK)                |
                |  name         (UNIQUE)  |
                |  admin_code   (UNIQUE)  |
                |  user_code    (UNIQUE)  |
                |  created_at             |
                +-----------+-------------+
                          1 |   | 1
                          N |   | N
        +-------------------+   +--------------------+
        |       users       |   |   feature_flags    |
        |  id (PK)          |   |  id (PK)           |
        |  email  (UNIQUE)  |   |  org_id (FK)       |
        |  password_hash    |   |  key               |
        |  role_id (FK)     |   |  enabled (0/1)     |
        |  org_id  (FK)     |   |  created_at        |
        |  created_at       |   |  updated_at        |
        +---------+---------+   |  UNIQUE(org_id,key)|
                N |             +--------------------+
                1 |
        +---------+---------+
        |       roles       |
        |  id (PK)          |
        |  name   (UNIQUE)  |
        +-------------------+

Legend:  1 --- N  means one-to-many.
The Super Admin is NOT a table row; it is config-based (stored in .env).
```

Key points:

- **`UNIQUE(org_id, key)`** on `feature_flags` is the heart of multi-tenancy: the same
  feature key can exist independently across organizations, but only once per org.
- **`org_id` is `NOT NULL`** on both users and flags, so there is no orphan tenant data.
- **Foreign keys are enforced** (`PRAGMA foreign_keys = ON`, set per connection).
- The **Super Admin is not stored in the database**; it is a config-based system operator.

---

## 🔐 Authentication & Tenant Isolation

- Passwords are hashed with **bcrypt** and never stored or returned in plaintext.
- Login issues a **JWT** carrying `{ userId, role, orgId, orgName }`. Authorization decisions
  use `orgId` **from the verified token**, never from the request body.
- The `authenticate` middleware verifies the token's signature and expiry; `requireRole`
  restricts routes by role.
- Because `orgId` is read from the token, an admin can only ever read/modify **their own
  org's** flags; a request for another org's flag returns `404` (from that tenant's
  perspective it does not exist).

### Invite codes (per-role, escalation-proof)

Each organization has two independent codes generated at creation:

- **`admin_code`**: required to sign up as an org admin.
- **`user_code`**: required to sign up as an end user.

Signup looks the organization up **by the code**, and each endpoint validates only its own
code. This prevents privilege escalation: an end user who holds only the `user_code` cannot
register through the admin endpoint (the codes don't match), and vice-versa. In production
these manually-distributed codes would be replaced by emailed, expiring invite links.

---

## 📡 API Reference

All request/response bodies are JSON. Protected routes require an
`Authorization: Bearer <token>` header.

### Super Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/superadmin/login` | public | Log in with static credentials |
| POST | `/api/superadmin/orgs` | super_admin | Create an organization (returns its two codes) |
| GET | `/api/superadmin/orgs` | super_admin | List organizations |

### Org Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/signup` | public | Sign up using the org's admin code |
| POST | `/api/admin/login` | public | Log in |
| POST | `/api/admin/flags` | org_admin | Create a flag in the caller's org |
| GET | `/api/admin/flags` | org_admin | List the caller's org's flags |
| PATCH | `/api/admin/flags/:key` | org_admin | Enable/disable a flag |
| DELETE | `/api/admin/flags/:key` | org_admin | Delete a flag |

### End User
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/user/signup` | public | Sign up using the org's user code |
| POST | `/api/user/login` | public | Log in |
| POST | `/api/user/features/check` | end_user | Check if a feature is enabled for the caller's org |
| GET | `/api/user/me` | end_user | Validate the current session (used by the frontend on load) |

Unknown feature keys return `{ enabled: false }`, a fail-safe default matching how real
feature-flag systems behave.

---

## 🧪 Testing

`backend/requests.http` is a runnable test suite (VS Code **REST Client** extension by Huachao Mao). It
walks the full system (super-admin login and org creation, admin/user signup and login,
flag CRUD) plus the key negative cases:

- Tenant isolation (one org cannot see or modify another's flags)
- Privilege escalation blocked in both directions (role-specific codes)
- Missing/expired tokens (`401`) and wrong-role access (`403`)
- Duplicate/empty inputs (`409` / `400`)

Run the requests top-to-bottom; response values (codes, tokens) are captured and reused
automatically.

---

## 🚧 Known Limitations & Future Work

- **Single access token** (no refresh tokens). Would add rotating refresh tokens for longer
  sessions without long-lived access tokens.
- **Invite codes are distributed manually.** Production would use emailed, expiring,
  single-use invite links.
- **All flags are visible to any end user who knows the key.** A production system would mark
  flags as "client-visible" vs. internal.
- **Token expiry is handled reactively** (a `401` bounces the client to login; the user app
  additionally validates via `/api/user/me` on load). Could add proactive client-side
  countdown/refresh.
- **Automated tests** are limited to the manual REST Client suite; unit/integration tests
  would be the next addition.
- **HS256 symmetric secret.** For a multi-service architecture, RS256 (sign with a private
  key, verify with a public key) would let downstream services verify without signing power.
