const express = require("express");
const cors = require("cors");
const { authenticate } = require("./middleware/auth");
const superAdminRoutes = require("./routes/superAdmin");

// Builds and configures the Express application.
// Kept separate from server.js so it can be imported in tests
// without actually binding to a network port.
function createApp() {
  const app = express();

  app.use(cors());         // let the browser frontends call this API
  app.use(express.json()); // parse JSON request bodies into req.body

  // Health-check endpoint — a trivial route to confirm the server is alive.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Gives back the identity decoded from caller's JWT.
  // Protected by authenticate - handy for debugging token flow.
  app.get("/api/whoami", authenticate, (req, res) => {
    res.json({ user: req.user });
  });

  app.use("/api/superadmin", superAdminRoutes);

  return app;
}

module.exports = { createApp };