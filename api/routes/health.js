const express = require("express");
const { healthCheck } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const startedAt = Date.now();
  try {
    const db = await healthCheck();
    res.json({
      status: "ok",
      service: "flagship-procurement-api",
      env: process.env.AZURE_ENV || "unknown",
      version: process.env.APP_VERSION || "0.1.0",
      db,
      uptime_ms: Date.now() - startedAt,
    });
  } catch (e) {
    res.status(503).json({
      status: "degraded",
      service: "flagship-procurement-api",
      error: e.message,
    });
  }
});

module.exports = router;