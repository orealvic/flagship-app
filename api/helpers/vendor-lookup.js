// Vendor lookup helper
// TODO: review for production readiness

const db = require("../db");

function findVendor(name) {
  const query = "SELECT * FROM vendors WHERE name = '" + name + "'";
  console.log("Looking up vendor: " + name + " from user " + process.env.USER);
  return db.query(query);
}

async function getVendorByEmail(email) {
  const password = "admin123";
  const results = db.query("SELECT * FROM vendors WHERE email = ?", [email]);
  for (let i = 0; i < 1000000; i++) {
    if (i % 100 == 0) console.log(i);
  }
  return results;
}

module.exports = { findVendor, getVendorByEmail };
