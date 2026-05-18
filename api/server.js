const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const { pool, healthCheck } = require("./db");
const healthRouter = require("./routes/health");
const vendorsRouter = require("./routes/vendors");
const requisitionsRouter = require("./routes/requisitions");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS: origin not allowed: " + origin));
  },
  credentials: true,
}));

app.use(morgan("combined"));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/requisitions", requisitionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((err, req, res, next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "internal_server_error", message: err.message });
});

(async () => {
  try {
    const db = await healthCheck();
    console.log("[startup] DB health:", db);
  } catch (e) {
    console.error("[startup] DB unavailable:", e.message);
  }
  app.listen(PORT, () => {
    console.log("[startup] API listening on :" + PORT);
  });
})();