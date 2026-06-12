/**
 * Test script for paymentService.js
 *
 * Run:  node services/testPayment.js
 */

const pay = require('./paymentService');

const TOTAL_BILL = 50000;

function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Payment Service – Test Run');
  console.log('═══════════════════════════════════════════════\n');

  console.log(`  Bill total: ₹${TOTAL_BILL}\n`);

  // ── 1. Cash payment ─────────────────────────────────────────────────
  console.log('── addPayment: CASH ₹20,000 ──');
  const p1 = pay.addPayment({ type: 'CASH', amount: 20000 }, TOTAL_BILL);
  console.log(p1);
  console.log();

  // ── 2. Gold exchange payment ────────────────────────────────────────
  console.log('── addPayment: GOLD 3g @ ₹6,500/g = ₹19,500 ──');
  const p2 = pay.addPayment(
    { type: 'GOLD', gold_weight: 3, gold_rate: 6500 },
    TOTAL_BILL
  );
  console.log(p2);
  console.log();

  // ── 3. UPI for remaining amount ─────────────────────────────────────
  const remaining = pay.calculateRemaining(TOTAL_BILL);
  console.log(`── Remaining before final payment: ₹${remaining} ──`);
  console.log('── addPayment: UPI ₹10,500 ──');
  const p3 = pay.addPayment({ type: 'UPI', amount: remaining }, TOTAL_BILL);
  console.log(p3);
  console.log();

  // ── 4. Summary ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('  PAYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════');
  pay.getPayments().forEach((p, i) => {
    const detail = p.type === 'GOLD'
      ? `${p.gold_weight}g × ₹${p.gold_rate}`
      : `₹${p.amount}`;
    console.log(`  ${i + 1}. ${p.type.padEnd(5)} | ${detail.padEnd(20)} | ₹${p.amount}`);
  });
  console.log('───────────────────────────────────────────────');
  console.log(`  Total Paid : ₹${pay.getTotalPaid()}`);
  console.log(`  Remaining  : ₹${pay.calculateRemaining(TOTAL_BILL)}`);
  console.log('═══════════════════════════════════════════════\n');

  // ── 5. Error handling demos ─────────────────────────────────────────
  console.log('── Error handling tests ──');

  try {
    pay.addPayment({ type: 'CASH', amount: 1 }, TOTAL_BILL);
  } catch (e) {
    console.log(`  ✓ Overpayment blocked: ${e.message}`);
  }

  try {
    pay.addPayment({ type: 'BITCOIN', amount: 100 }, TOTAL_BILL);
  } catch (e) {
    console.log(`  ✓ Invalid type blocked: ${e.message}`);
  }

  try {
    pay.addPayment({ type: 'CASH', amount: -500 }, TOTAL_BILL);
  } catch (e) {
    console.log(`  ✓ Negative amount blocked: ${e.message}`);
  }

  try {
    pay.addPayment({ type: 'GOLD', gold_weight: 0, gold_rate: 6500 }, TOTAL_BILL);
  } catch (e) {
    console.log(`  ✓ Zero gold weight blocked: ${e.message}`);
  }

  console.log('\n✅  All tests passed.');

  // ── 6. Cleanup ──────────────────────────────────────────────────────
  pay.clearPayments();
  console.log(`Payments after clear: ${pay.getPayments().length} entries.\n`);
}

runTests();
