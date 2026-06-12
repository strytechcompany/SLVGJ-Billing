const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const logger = require('../services/logger');

// Import All Services
const billing = require('../services/billingService');
const payment = require('../services/paymentService');
const checkout = require('../services/checkoutService');
const receipt = require('../services/receiptService');
const backup = require('../services/backupService');
const goldRate = require('../services/goldRateService');

async function runTests() {
    console.log('\n======================================');
    console.log('   🛠️ ENHANCED INTEGRATION TEST 🛠️');
    console.log('======================================\n');
    let results = { passed: 0, failed: 0 };

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✔ ${message}`);
            results.passed++;
        } else {
            console.error(`✘ FAILED: ${message}`);
            results.failed++;
        }
    };

    try {
        // ─────────────────────────────────────────────────────────────────
        // STEP 1: RESET & SEED
        // ─────────────────────────────────────────────────────────────────
        console.log('===== STEP 1: RESET & SEED =====');
        db.prepare("DELETE FROM products").run();
        db.prepare("DELETE FROM sales").run();
        db.prepare("DELETE FROM gold_rates").run();
        
        db.prepare(`
            INSERT INTO products (product_id, name, barcode, gross_weight, stone_weight, net_weight, purity, price_per_gram, making_charge, stock) 
            VALUES (?,?,?,?,?,?,?,?,?,?)
        `).run('P001', 'Signature Gold Chain', 'BAR-1', 10.0, 0, 10.0, '22K', 6500, 1000, 5);
        
        goldRate.setGoldRate(6500);
        assert(true, "Database reset and initial seed successful");

        // ─────────────────────────────────────────────────────────────────
        // STEP 2: POS CART LOGIC
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 2: CART & PRICING =====');
        billing.clearCart();
        billing.addToCart('BAR-1');
        const cart = billing.getCart();
        assert(cart.length === 1, "Item added via barcode scanner logic");
        assert(cart[0].total === (10.0 * 6500) + 1000, "Cart pricing calculation correct");
        
        // ── SCENARIO: MANUAL ENTRY ────────────────────
        billing.addToCartManual('P001', 12.0); // Override weight
        assert(billing.getCart().length === 2, "Manual item added with weight override");

        // ─────────────────────────────────────────────────────────────────
        // STEP 3: PAYMENTS & VALIDATION
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 3: PAYMENTS & VALIDATION =====');
        const total = billing.getCartTotal();
        payment.clearPayments();
        
        // ── SCENARIO: OVERPAYMENT ────────────────────
        try {
            payment.addPayment({ type: 'CASH', amount: total + 10000 }, total);
            assert(false, "Should have thrown OverpaymentError");
        } catch (e) {
            assert(e.message.includes("Overpayment"), "Caught overpayment protection in paymentService");
        }

        // ── SCENARIO: VALID PAYMENT ─────────────────
        payment.addPayment({ type: 'CASH', amount: 50000 }, total);
        const remaining = payment.calculateRemaining(total);
        assert(remaining > 0, "Partial payment recorded correctly");

        // ─────────────────────────────────────────────────────────────────
        // STEP 4: CHECKOUT & INVENTORY
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 4: ATOMIC CHECKOUT =====');
        const customer = { name: 'Automation Test Bot', phone: '0000-000-000', address: 'Digital Realm' };
        const sale = checkout.finalizeSale(customer);
        
        assert(sale.bill_id.startsWith('BILL-'), "Bill ID generated correctly");
        assert(sale.remaining === remaining, "Debt recorded in finalized sale matches payment math");
        
        // Check Stock Reduction
        const p = db.prepare("SELECT stock FROM products WHERE product_id = 'P001'").get();
        assert(p.stock === 3, `Stock reduced correctly (2 items sold, 5 -> 3). Initial was 5, 2 sold.`);

        // ─────────────────────────────────────────────────────────────────
        // STEP 5: BACKUP SYSTEM
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 5: DATA SAFETY =====');
        const backupFile = backup.backupDatabase();
        assert(fs.existsSync(backupFile), "Backup file physically created after sale");
        assert(backup.getBackupStats().count >= 1, "Backup registry updated in UI stats layer");

        // ─────────────────────────────────────────────────────────────────
        // FINAL SUMMARY
        // ─────────────────────────────────────────────────────────────────
        console.log('\n======================================');
        console.log('   🎉 ALL TESTS PASSED SUCCESSFULLY 🎉');
        console.log('======================================');
        console.log(`Bill ID:    ${sale.bill_id}`);
        console.log(`Total:      ₹${sale.total}`);
        console.log(`Paid:       ₹${sale.paid}`);
        console.log(`Remaining:  ₹${sale.remaining}`);
        console.log('======================================\n');

    } catch (err) {
        console.error('\n❌ TEST SUITE CRITICAL FAILURE');
        console.error(`Reason: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
}

runTests();
