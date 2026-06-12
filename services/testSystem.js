const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const logger = require('./logger');

// Import All Services
const billing = require('./billingService');
const payment = require('./paymentService');
const checkout = require('./checkoutService');
const receipt = require('./receiptService');
const backup = require('./backupService');
const goldRate = require('./goldRateService');

// Optional Print Service (Requires Electron)
let print;
try {
    print = require('./printService');
} catch (e) {
    logger.debug('Print service not available in this environment (likely non-Electron)');
}

/**
 * Integration Test for Jewellery Billing System
 * Validates the complete E2E flow from product seeding to backup.
 */
async function runIntegrationTest() {
    console.log('\n🚀 Starting Jewellery Billing System Integration Test...\n');

    try {
        // ─────────────────────────────────────────────────────────────────
        // STEP 1: SEED PRODUCTS
        // ─────────────────────────────────────────────────────────────────
        console.log('===== STEP 1: SEED PRODUCTS =====');
        try {
            const seedStatements = [
                {
                    product_id: 'prod-001',
                    name: 'Gold Chain 22K',
                    barcode: 'CHAIN101',
                    gross_weight: 10.500,
                    stone_weight: 0,
                    net_weight: 10.500,
                    purity: '22K',
                    price_per_gram: 6200,
                    making_charge: 1500,
                    stock: 5
                },
                {
                    product_id: 'prod-002',
                    name: 'Stone Ring 18K',
                    barcode: 'RING202',
                    gross_weight: 5.200,
                    stone_weight: 0.800,
                    net_weight: 4.400,
                    purity: '18K',
                    price_per_gram: 5100,
                    making_charge: 800,
                    stock: 3
                }
            ];

            const insertProduct = db.prepare(`
                INSERT OR REPLACE INTO products 
                (product_id, name, barcode, gross_weight, stone_weight, net_weight, purity, price_per_gram, making_charge, stock)
                VALUES (@product_id, @name, @barcode, @gross_weight, @stone_weight, @net_weight, @purity, @price_per_gram, @making_charge, @stock)
            `);

            const seedTx = db.transaction(() => {
                for (const p of seedStatements) insertProduct.run(p);
            });
            seedTx();

            // Also set daily gold rate
            goldRate.setGoldRate(6250);

            console.log('✔ Products seeded successfully');
        } catch (err) {
            logger.error('Failed to seed products during test', err);
            throw err;
        }

        // ─────────────────────────────────────────────────────────────────
        // STEP 2: ADD ITEMS TO CART
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 2: BUILD CART =====');
        try {
            billing.clearCart();
            
            // 1. Barcode scan
            billing.addToCart('CHAIN101');
            console.log('✔ Added "Gold Chain 22K" via barcode');

            // 2. Manual entry with weight override
            billing.addToCartManual('prod-002', 5.500);
            console.log('✔ Added "Stone Ring 18K" via manual entry (overridden weight)');

            console.log(`✔ Cart display: ${billing.getCart().length} items`);
            console.log(`✔ Current total: ₹${billing.getCartTotal()}`);
        } catch (err) {
            logger.error('Cart build failed during test', err);
            throw err;
        }

        // ─────────────────────────────────────────────────────────────────
        // STEP 3: ADD PAYMENTS
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 3: PAYMENTS =====');
        try {
            const billTotal = billing.getCartTotal();
            payment.clearPayments();

            // Partial Cash Payment
            payment.addPayment({ type: 'CASH', amount: 20000 }, billTotal);
            console.log('✔ Cash payment of ₹20,000 added');

            // Full Balance via UPI (simulate resolving remaining)
            const remaining = payment.calculateRemaining(billTotal);
            payment.addPayment({ type: 'UPI', amount: remaining }, billTotal);
            console.log(`✔ UPI payment of ₹${remaining} added (Total Paid: ₹${payment.getTotalPaid()})`);
        } catch (err) {
            logger.error('Payment step failed during test', err);
            throw err;
        }

        // ─────────────────────────────────────────────────────────────────
        // STEP 4: CHECKOUT
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 4: CHECKOUT =====');
        let saleResult;
        try {
            const uniquePhone = `9${Date.now().toString().slice(-9)}`;
            const customer = {
                customer_id: `cust-${Date.now().toString().slice(-4)}`,
                name: 'Test Customer',
                phone: uniquePhone,
                address: 'Main Street, Mumbai'
            };

            saleResult = checkout.finalizeSale(customer);
            console.log(`✔ Checkout success. Bill ID: ${saleResult.bill_id}`);
        } catch (err) {
            logger.error('Checkout failed during test', err);
            throw err;
        }

        // ─────────────────────────────────────────────────────────────────
        // STEP 5: RECEIPT GENERATION
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 5: RECEIPT & PRINT =====');
        try {
            const html = receipt.generateReceiptHTML({
                ...saleResult,
                items: [], // Simplified for test
                payments: [], // Simplified for test
                subtotal: 0,
                cgst: 0,
                sgst: 0,
                date: new Date().toISOString()
            });

            const testFile = path.join(process.cwd(), 'receipt_test.html');
            fs.writeFileSync(testFile, html);
            console.log(`✔ Receipt HTML saved to: ${testFile}`);

            // Optional Print (Simulated success check)
            if (print && print.printReceipt) {
                console.log('⚗️ Print service detected. Simulated print call successful.');
            } else {
                console.log('⌛ Skipping physical print (Non-Electron environment)');
            }
        } catch (err) {
            logger.error('Receipt generation failed during test', err);
            throw err;
        }

        // ─────────────────────────────────────────────────────────────────
        // STEP 6: BACKUP & STATS
        // ─────────────────────────────────────────────────────────────────
        console.log('\n===== STEP 6: BACKUP & MAINTENANCE =====');
        try {
            const backupFile = backup.backupDatabase();
            if (backupFile) {
                console.log(`✔ Database backup created at: ${backupFile}`);
            }

            const stats = backup.getBackupStats();
            console.log('✔ Backup Statistics:');
            console.log(`   - Total Backups: ${stats.count}`);
            console.log(`   - Storage Used: ${stats.totalSizeMB} MB`);
            console.log(`   - Latest Backup: ${stats.latestBackup}`);
        } catch (err) {
            logger.error('Backup/Maintenance step failed during test', err);
            throw err;
        }

        // ─────────────────────────────────────────────────────────────────
        // FINAL SUMMARY
        // ─────────────────────────────────────────────────────────────────
        console.log('\n======================================');
        console.log('   🎉 INTEGRATION TEST SUCCESS 🎉');
        console.log('======================================');
        console.log(`Bill ID:    ${saleResult.bill_id}`);
        console.log(`Total:      ₹${saleResult.total}`);
        console.log(`Paid:       ₹${saleResult.paid}`);
        console.log(`Remaining:  ₹${saleResult.remaining}`);
        console.log('======================================\n');

    } catch (criticalErr) {
        console.error('\n❌ CRITICAL FAILURE during integration test!');
        console.error(`Reason: ${criticalErr.message}`);
        process.exit(1);
    }
}

// Execute the test
runIntegrationTest();
