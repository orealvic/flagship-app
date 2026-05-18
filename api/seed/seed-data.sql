INSERT IGNORE INTO vendors (id, name, email, status) VALUES
  (1, 'Acme Office Supplies', 'sales@acmeoffice.example.com', 'active'),
  (2, 'BlueWave Software Licensing', 'orders@bluewave.example.com', 'active'),
  (3, 'CloudHost Compute Partners', 'billing@cloudhost.example.com', 'active'),
  (4, 'Drafts Coffee Roasters', 'wholesale@draftscoffee.example.com', 'active'),
  (5, 'Equinox Lab Equipment Co.', 'sales@equinoxlab.example.com', 'inactive');

INSERT IGNORE INTO requisitions (id, title, requester, vendor_id, status, total_amount) VALUES
  (1, 'Q3 Office Supplies Restock', 'sarah.k@example.com', 1, 'approved', 1247.50),
  (2, 'Annual MySQL Workbench Enterprise Licenses', 'devops@example.com', 2, 'submitted', 4800.00),
  (3, 'Engineering Team Coffee Subscription', 'office@example.com', 4, 'fulfilled', 280.00);

INSERT IGNORE INTO line_items (id, requisition_id, description, quantity, unit_price) VALUES
  (1, 1, 'A4 Printer Paper (case)', 10, 42.50),
  (2, 1, 'Black ballpoint pens (box of 50)', 5, 18.00),
  (3, 1, 'Sticky note variety pack', 20, 11.25),
  (4, 1, 'Heavy-duty stapler', 15, 38.75),
  (5, 2, 'MySQL Workbench Enterprise (per seat)', 12, 400.00),
  (6, 3, 'House blend coffee (2.5 lb bag)', 8, 35.00);