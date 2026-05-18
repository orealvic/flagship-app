const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER || "flagshipadmin",
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || "procurement",
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

async function healthCheck() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query("SELECT 1 AS ok, NOW() AS now");
    return { ok: rows[0].ok === 1, server_time: rows[0].now };
  } finally {
    conn.release();
  }
}

module.exports = { pool, healthCheck };