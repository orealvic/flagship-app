const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, status, created_at FROM vendors ORDER BY name"
    );
    res.json({ vendors: rows });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, status, created_at FROM vendors WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "vendor_not_found" });
    res.json({ vendor: rows[0] });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name) return res.status(400).json({ error: "name_required" });
    const [result] = await pool.query(
      "INSERT INTO vendors (name, email, status) VALUES (?, ?, 'active')",
      [name, email || null]
    );
    res.status(201).json({ id: result.insertId, name, email, status: "active" });
  } catch (e) { next(e); }
});

module.exports = router;