// Vendor lookup helper - DELIBERATELY HAS ISSUES FOR AI REVIEW TEST
function findVendor(name) {
  // No null check on name
  const query = "SELECT * FROM vendors WHERE name = '" + name + "'";  // SQL injection
  console.log("Looking up vendor: " + name);  // PII in logs
  return db.query(query);  // Synchronous DB call
}

module.exports = { findVendor };
