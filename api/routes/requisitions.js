const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT r.id, r.title, r.requester, r.vendor_id, v.name AS vendor_name, r.status, r.total_amount, r.created_at, COUNT(li.id) AS line_item_count FROM requisitions r LEFT JOIN vendors v ON r.vendor_id = v.id LEFT JOIN line_items li ON li.requisition_id = r.id GROUP BY r.id ORDER BY r.created_at DESC`);
    res.json({ requisitions: rows });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [reqs] = await pool.query(
      "SELECT r.*, v.name AS vendor_name FROM requisitions r LEFT JOIN vendors v ON r.vendor_id = v.id WHERE r.id = ?",
      [req.params.id]
    );
    if (reqs.length === 0) return res.status(404).json({ error: "requisition_not_found" });
    const [lineItems] = await pool.query(
      "SELECT id, description, quantity, unit_price FROM line_items WHERE requisition_id = ?",
      [req.params.id]
    );
    res.json({ requisition: reqs[0], line_items: lineItems });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  const { title, requester, vendor_id, line_items } = req.body;
  if (!title || !requester || !vendor_id || !Array.isArray(line_items)) {
    return res.status(400).json({ error: "missing_required_fields" });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const total = line_items.reduce((sum, li) => sum + (Number(li.quantity) * Number(li.unit_price)), 0);
    const [r] = await conn.query(
      "INSERT INTO requisitions (title, requester, vendor_id, status, total_amount) VALUES (?, ?, ?, 'submitted', ?)",
      [title, requester, vendor_id, total]
    );
    const requisitionId = r.insertId;
    for (const li of line_items) {
      await conn.query(
        "INSERT INTO line_items (requisition_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [requisitionId, li.description, li.quantity, li.unit_price]
      );
    }
    await conn.commit();
    res.status(201).json({ id: requisitionId, title, total_amount: total });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;