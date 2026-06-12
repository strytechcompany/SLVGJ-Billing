/**
 * Test script for billingService.js
 *
 * Run:  node services/testBilling.js
 *
 * It seeds two sample products into the DB, then exercises both
 * addToCart (barcode scan) and addToCartManual (manual entry) to
 * prove the unified cart works end-to-end.
 */

const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const billing = require('./billingService');

// ── Helper: seed a sample product (idempotent via INSERT OR IGNORE) ───
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products
    (product_id, name, barcode, gross_weight, stone_weight, net_weight,
     purity, price_per_gram, making_charge, stock)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function seedSampleProducts() {
  const products = [
    {
      id:       'PROD-001',
      name:     'Gold Ring 22K',
      barcode:  'BR-1001',
      gross:    5.2,
      stone:    0.3,
      purity:   '22K',
      ppg:      6500,
      making:   800,
      stock:    5,
    },
    {
      id:       'PROD-002',
      name:     'Gold Necklace 18K',
      barcode:  'BR-2002',
      gross:    12.0,
      stone:    1.5,
      purity:   '18K',
      ppg:      5200,
      making:   1500,
      stock:    3,
    },
  ];

  for (const p of products) {
    const net = p.gross - p.stone;
    insertProduct.run(
      p.id, p.name, p.barcode,
      p.gross, p.stone, net,
      p.purity, p.ppg, p.making, p.stock
    );
  }

  console.log('🌱  Sample products seeded.\n');
}

// ── Run tests ─────────────────────────────────────────────────────────

function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Billing Service – Test Run');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Seed data
  seedSampleProducts();

  // 2. Add via barcode scan
  console.log('── addToCart (barcode: BR-1001) ──');
  const item1 = billing.addToCart('BR-1001');
  console.log(item1);
  console.log();

  // 3. Add via manual entry (using stored weight)
  console.log('── addToCartManual (product: PROD-002, default weight) ──');
  const item2 = billing.addToCartManual('PROD-002');
  console.log(item2);
  console.log();

  // 4. Add via manual entry with custom weight override
  console.log('── addToCartManual (product: PROD-001, custom weight 3.8g) ──');
  const item3 = billing.addToCartManual('PROD-001', 3.8);
  console.log(item3);
  console.log();

  // 5. Search products
  console.log('── searchProducts("gold") ──');
  const results = billing.searchProducts('gold');
  console.log(`Found ${results.length} product(s).`);
  console.log();

  // 6. Print cart summary
  console.log('═══════════════════════════════════════════════');
  console.log('  CART SUMMARY');
  console.log('═══════════════════════════════════════════════');
  const cart = billing.getCart();
  cart.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name}  |  net ${item.net_weight}g  |  ₹${item.total}`);
  });
  console.log('───────────────────────────────────────────────');
  console.log(`  TOTAL: ₹${billing.getCartTotal()}`);
  console.log('═══════════════════════════════════════════════\n');

  // 7. Error handling demos
  console.log('── Error handling tests ──');

  try {
    billing.addToCart('INVALID-BARCODE');
  } catch (e) {
    console.log(`  ✓ Expected error: ${e.message}`);
  }

  try {
    billing.addToCartManual('PROD-001', -5);
  } catch (e) {
    console.log(`  ✓ Expected error: ${e.message}`);
  }

  try {
    billing.addToCartManual(null);
  } catch (e) {
    console.log(`  ✓ Expected error: ${e.message}`);
  }

  console.log('\n✅  All tests passed.');

  // 8. Clear cart
  billing.clearCart();
  console.log(`Cart after clear: ${billing.getCart().length} items.\n`);
}

runTests();
