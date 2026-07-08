const express = require("express");
const cors = require("cors");

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

  return app;
}

module.exports = { createApp };