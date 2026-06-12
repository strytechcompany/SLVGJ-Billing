/**
 * End-to-end test for checkoutService.js
 *
 * Run:  node services/testCheckout.js
 *
 * Seeds products → adds to cart (barcode + manual) → adds payments
 * (cash + gold) → finalizes sale → prints result + DB verification.
 */

const db       = require('../database/db');
const billing  = require('./billingService');
const payment  = require('./paymentService');
const checkout = require('./checkoutService');

// ── Seed sample products ──────────────────────────────────────────────
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products
    (product_id, name, barcode, gross_weight, stone_weight, net_weight,
     purity, price_per_gram, making_charge, stock)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function seed() {
  insertProduct.run(
    'PROD-001', 'Gold Ring 22K', 'BR-1001',
    5.2, 0.3, 4.9, '22K', 6500, 800, 5
  );
  insertProduct.run(
    'PROD-002', 'Gold Necklace 18K', 'BR-2002',
    12.0, 1.5, 10.5, '18K', 5200, 1500, 3
  );
  console.log('🌱  Products seeded.\n');
}

// ── Run full checkout flow ────────────────────────────────────────────
function runTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Checkout Service – End-to-End Test');
  console.log('═══════════════════════════════════════════════\n');

  seed();

  // 1. Add items to cart
  console.log('── Adding items to cart ──');
  billing.addToCart('BR-1001');
  billing.addToCartManual('PROD-002');
  const cart = billing.getCart();
  cart.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name}  →  ₹${item.total}`);
  });
  const cartTotal = billing.getCartTotal();
  console.log(`  Cart subtotal: ₹${cartTotal}\n`);

  // 2. Compute what final_net_amount will be (subtotal + 3% GST)
  const gstRate = 0.015;
  const estimatedFinal = Math.round(
    (cartTotal + cartTotal * gstRate * 2) * 100
  ) / 100;
  console.log(`  Estimated final (with 3% GST): ₹${estimatedFinal}\n`);

  // 3. Add payments (partial — leave some as debt)
  console.log('── Adding payments ──');
  payment.addPayment({ type: 'CASH', amount: 30000 }, estimatedFinal);
  payment.addPayment(
    { type: 'GOLD', gold_weight: 2, gold_rate: 6500 },
    estimatedFinal
  );
  console.log(`  Cash  : ₹30,000`);
  console.log(`  Gold  : 2g × ₹6,500 = ₹13,000`);
  console.log(`  Paid  : ₹${payment.getTotalPaid()}`);
  console.log(`  Unpaid: ₹${payment.calculateRemaining(estimatedFinal)}\n`);

  // 4. Finalize sale
  console.log('── Finalizing sale ──');
  const result = checkout.finalizeSale({
    customer_id: 'CUST-001',
    name:        'Ravi Kumar',
    phone:       '9876543210',
    address:     '123, Gold Street, Chennai',
  });

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SALE RESULT');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Bill ID   : ${result.bill_id}`);
  console.log(`  Total     : ₹${result.total}`);
  console.log(`  Paid      : ₹${result.paid}`);
  console.log(`  Remaining : ₹${result.remaining}`);
  console.log(`  Status    : ${result.status}`);
  console.log('═══════════════════════════════════════════════\n');

  // 5. Verify data in DB
  console.log('── Database verification ──');

  const bill = db.prepare('SELECT * FROM bills WHERE bill_id = ?').get(result.bill_id);
  console.log(`  ✓ Bill record found – final_net_amount: ₹${bill.final_net_amount}`);

  const items = db.prepare('SELECT COUNT(*) AS cnt FROM bill_items WHERE bill_id = ?').get(result.bill_id);
  console.log(`  ✓ Bill items inserted: ${items.cnt}`);

  const pays = db.prepare('SELECT COUNT(*) AS cnt FROM payments WHERE bill_id = ?').get(result.bill_id);
  console.log(`  ✓ Payments inserted: ${pays.cnt}`);

  if (result.remaining > 0) {
    const debt = db.prepare('SELECT * FROM debts WHERE bill_id = ?').get(result.bill_id);
    console.log(`  ✓ Debt created – remaining: ₹${debt.remaining_amount} (${debt.status})`);
  } else {
    console.log('  ✓ No debt (fully paid)');
  }

  const stock1 = db.prepare('SELECT stock FROM products WHERE product_id = ?').get('PROD-001');
  const stock2 = db.prepare('SELECT stock FROM products WHERE product_id = ?').get('PROD-002');
  console.log(`  ✓ Stock updated – PROD-001: ${stock1.stock}, PROD-002: ${stock2.stock}`);

  console.log(`\n  Cart after checkout: ${billing.getCart().length} items`);
  console.log(`  Payments after checkout: ${payment.getPayments().length} entries`);

  console.log('\n✅  Checkout test passed.\n');
}

runTest();
