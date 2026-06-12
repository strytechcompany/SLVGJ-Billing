const db = require('./database/db');

try {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS bill_items;');
  db.exec('DROP TABLE IF EXISTS payments;');
  db.exec('DROP TABLE IF EXISTS debt_transactions;');
  db.exec('DROP TABLE IF EXISTS debts;');
  db.exec('DROP TABLE IF EXISTS bills;');
  db.exec('DROP TABLE IF EXISTS customers;');
  db.exec('DROP TABLE IF EXISTS products;');
  db.exec('DROP TABLE IF EXISTS gold_rate;');
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('Tables dropped successfully.');
  
  // Re-run init to recreate tables with the updated schema
  require('./database/init')();
} catch (e) {
  console.error('Failed to wipe DB:', e);
}
