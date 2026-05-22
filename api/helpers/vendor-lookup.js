// Vendor lookup helper - has issues for AI review test

function findVendor(name) {
  const query = "SELECT * FROM vendors WHERE name = '" + name + "'";
  console.log("Looking up vendor: " + name);
  return db.query(query);
}

module.exports = { findVendor };

