const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  console.log("Connecting to MySQL...");
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER || "flagshipadmin",
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "procurement",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    ssl: { rejectUnauthorized: true },
    multipleStatements: true,
  });
  console.log("Running migrations...");
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(__dirname, f), "utf8");
    console.log("  ->", f);
    await conn.query(sql);
  }
  console.log("Seeding data...");
  const seedFile = path.join(__dirname, "..", "seed", "seed-data.sql");
  if (fs.existsSync(seedFile)) {
    const sql = fs.readFileSync(seedFile, "utf8");
    await conn.query(sql);
  }
  console.log("Done.");
  await conn.end();
})().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});