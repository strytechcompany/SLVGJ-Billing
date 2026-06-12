const db = require('./db');

// ────────────────────────────────────────────────────────────────────────
//  initDatabase – creates every table, index, and constraint in a single
//  transaction so the schema is applied atomically.
// ────────────────────────────────────────────────────────────────────────
function initDatabase() {
  const createTables = db.transaction(() => {

    // ── 1. customers ──────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id   TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        phone         TEXT,
        address       TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── 2. bills ──────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS bills (
        bill_id           TEXT PRIMARY KEY,
        bill_datetime     TIMESTAMP NOT NULL,

        customer_id       TEXT,
        customer_name     TEXT NOT NULL,
        customer_phone    TEXT,
        customer_address  TEXT,

        subtotal          REAL NOT NULL CHECK (subtotal >= 0),
        making_charges    REAL DEFAULT 0 CHECK (making_charges >= 0),

        cgst_amount       REAL NOT NULL CHECK (cgst_amount >= 0),
        sgst_amount       REAL NOT NULL CHECK (sgst_amount >= 0),
        total_gst_amount  REAL NOT NULL CHECK (total_gst_amount >= 0),

        final_net_amount  REAL NOT NULL CHECK (final_net_amount >= 0),

        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id) REFERENCES customers (customer_id) ON DELETE CASCADE
      );
    `);

    // ── 3. products (NAREN) ───────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        product_id      TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        barcode         TEXT UNIQUE,

        gross_weight    REAL,
        stone_weight    REAL DEFAULT 0,
        net_weight      REAL,

        purity          TEXT,
        buying_price    REAL DEFAULT 0,
        price_per_gram  REAL,
        making_charge   REAL,

        stock           INTEGER DEFAULT 1 CHECK (stock >= 0),

        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── 4. bill_items ─────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id              TEXT PRIMARY KEY,
        bill_id         TEXT NOT NULL,

        product_id      TEXT,
        item_name       TEXT NOT NULL,

        gross_weight    REAL,
        stone_weight    REAL DEFAULT 0,
        net_weight      REAL,

        purity          TEXT,
        rate            REAL,
        making_charge   REAL DEFAULT 0,
        selling_price   REAL DEFAULT 0,

        total           REAL NOT NULL CHECK (total >= 0),

        FOREIGN KEY (bill_id)     REFERENCES bills    (bill_id)     ON DELETE CASCADE,
        FOREIGN KEY (product_id)  REFERENCES products (product_id)  ON DELETE CASCADE
      );
    `);

    // ── 5. payments ───────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id              TEXT PRIMARY KEY,
        bill_id         TEXT NOT NULL,

        payment_type    TEXT CHECK (payment_type IN ('CASH', 'CARD', 'UPI', 'GOLD')),

        amount          REAL DEFAULT 0 CHECK (amount >= 0),

        gold_weight     REAL DEFAULT 0,
        gold_rate       REAL DEFAULT 0,

        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (bill_id) REFERENCES bills (bill_id) ON DELETE CASCADE
      );
    `);

    // ── 6. debts ──────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS debts (
        debt_id           TEXT PRIMARY KEY,

        bill_id           TEXT NOT NULL,
        customer_id       TEXT,

        total_amount      REAL NOT NULL CHECK (total_amount >= 0),
        paid_amount       REAL DEFAULT 0 CHECK (paid_amount >= 0),
        remaining_amount  REAL NOT NULL CHECK (remaining_amount >= 0),

        status            TEXT CHECK (status IN ('OPEN', 'CLOSED')),

        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (bill_id)     REFERENCES bills     (bill_id)     ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers (customer_id) ON DELETE CASCADE
      );
    `);

    // ── 7. debt_transactions ──────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS debt_transactions (
        id              TEXT PRIMARY KEY,
        debt_id         TEXT NOT NULL,

        payment_type    TEXT CHECK (payment_type IN ('CASH', 'CARD', 'UPI', 'GOLD')),

        amount          REAL DEFAULT 0 CHECK (amount >= 0),

        gold_weight     REAL DEFAULT 0,
        gold_rate       REAL DEFAULT 0,

        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (debt_id) REFERENCES debts (debt_id) ON DELETE CASCADE
      );
    `);

    // ── 8. gold_rate (ADMIN) ──────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS gold_rate (
        id              TEXT PRIMARY KEY,
        rate_per_gram   REAL NOT NULL CHECK (rate_per_gram > 0),
        effective_date  TIMESTAMP NOT NULL
      );
    `);

    // ── Indexes ───────────────────────────────────────────────────────
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id   ON bill_items (bill_id);
      CREATE INDEX IF NOT EXISTS idx_payments_bill_id     ON payments   (bill_id);
      CREATE INDEX IF NOT EXISTS idx_debts_bill_id        ON debts      (bill_id);
      CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products   (barcode);
    `);

    // ── Migrations – add columns to existing tables ──────────────────
    //  (ALTER TABLE ... ADD COLUMN is a no-op if the column exists in
    //   SQLite 3.35+; for older versions we catch & ignore the error.)
    const migrations = [
      `ALTER TABLE products   ADD COLUMN buying_price  REAL DEFAULT 0`,
      `ALTER TABLE bill_items ADD COLUMN selling_price REAL DEFAULT 0`,
    ];
    for (const sql of migrations) {
      try { db.exec(sql); } catch (_) { /* column already exists */ }
    }
  });

  // Run the transaction
  createTables();

  console.log('✅ Database initialised – all tables & indexes are ready.');
}

// ── Execute immediately when this script is run directly ──────────────
initDatabase();

module.exports = initDatabase;
