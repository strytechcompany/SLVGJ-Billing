/**
 * Test script for receiptService.js
 *
 * Run:  node services/testReceipt.js
 *
 * Generates a sample receipt HTML and writes it to /tmp/receipt_preview.html
 * so you can open it in a browser to verify the layout.
 */

const fs = require('fs');
const path = require('path');
const { generateReceiptHTML } = require('./receiptService');

const saleData = {
  bill_id: 'BILL-20260329-001',
  date: new Date().toISOString(),

  customer: {
    name:  'Ravi Kumar',
    phone: '9876543210',
  },

  items: [
    {
      name:          'Gold Ring 22K',
      gross_weight:  5.2,
      stone_weight:  0.3,
      net_weight:    4.9,
      rate:          6500,
      making_charge: 800,
      total:         32650,
    },
    {
      name:          'Gold Necklace 18K',
      gross_weight:  12.0,
      stone_weight:  1.5,
      net_weight:    10.5,
      rate:          5200,
      making_charge: 1500,
      total:         56100,
    },
  ],

  payments: [
    { type: 'CASH',  amount: 30000, gold_weight: 0, gold_rate: 0 },
    { type: 'GOLD',  amount: 13000, gold_weight: 2, gold_rate: 6500 },
    { type: 'UPI',   amount: 10000, gold_weight: 0, gold_rate: 0 },
  ],

  subtotal:  86450,
  cgst:      1329.75,
  sgst:      1329.75,
  total:     89109.50,
  paid:      53000,
  remaining: 36109.50,
};

const html = generateReceiptHTML(saleData);

// Write to a preview file
const outPath = path.join(__dirname, '..', 'receipt_preview.html');
fs.writeFileSync(outPath, html, 'utf-8');

console.log('═══════════════════════════════════════════════');
console.log('  Receipt Service – Test');
console.log('═══════════════════════════════════════════════\n');
console.log(`  ✓ HTML generated (${html.length} characters)`);
console.log(`  ✓ Preview saved to: ${outPath}`);
console.log(`\n  Open the file in a browser to verify the layout.`);
console.log('  Press Ctrl+P to test print preview.\n');
console.log('✅  Receipt test passed.\n');
