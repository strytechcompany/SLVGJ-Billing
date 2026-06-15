const db = require('../database/db');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

const billing      = require('./billingService');
const payment      = require('./paymentService');
const billNumber   = require('./billNumberService');
const backupSystem = require('./backupService');

// ════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════

/** Round a number to 2 decimal places. */
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ════════════════════════════════════════════════════════════════════════
//  PREPARED STATEMENTS
// ════════════════════════════════════════════════════════════════════════

const stmts = {
  insertBill: db.prepare(`
    INSERT INTO bills
      (bill_id, bill_datetime, customer_id, customer_name, customer_phone,
       customer_address, subtotal, making_charges, cgst_amount, sgst_amount,
       total_gst_amount, final_net_amount)
    VALUES
      (@bill_id, @bill_datetime, @customer_id, @customer_name, @customer_phone,
       @customer_address, @subtotal, @making_charges, @cgst_amount, @sgst_amount,
       @total_gst_amount, @final_net_amount)
  `),

  insertBillItem: db.prepare(`
    INSERT INTO bill_items
      (id, bill_id, product_id, item_name, gross_weight, stone_weight,
       net_weight, purity, rate, making_charge, selling_price, total)
    VALUES
      (@id, @bill_id, @product_id, @item_name, @gross_weight, @stone_weight,
       @net_weight, @purity, @rate, @making_charge, @selling_price, @total)
  `),

  insertPayment: db.prepare(`
    INSERT INTO payments
      (id, bill_id, payment_type, amount, gold_weight, gold_rate, created_at)
    VALUES
      (@id, @bill_id, @payment_type, @amount, @gold_weight, @gold_rate, @created_at)
  `),

  insertDebt: db.prepare(`
    INSERT INTO debts
      (debt_id, bill_id, customer_id, total_amount, paid_amount,
       remaining_amount, status)
    VALUES
      (@debt_id, @bill_id, @customer_id, @total_amount, @paid_amount,
       @remaining_amount, @status)
  `),

  reduceStock: db.prepare(`
    UPDATE products
       SET stock = stock - 1
     WHERE product_id = ? AND stock > 0
  `),

  checkStock: db.prepare(`
    SELECT stock FROM products WHERE product_id = ?
  `),

  upsertCustomer: db.prepare(`
    INSERT INTO customers (customer_id, name, phone, address)
      VALUES (@customer_id, @name, @phone, @address)
    ON CONFLICT(customer_id) DO UPDATE SET
      name    = excluded.name,
      phone   = excluded.phone,
      address = excluded.address
  `),
};

// ════════════════════════════════════════════════════════════════════════
//  GST CONFIGURATION
// ════════════════════════════════════════════════════════════════════════

const GST_RATE = 0.015;   // 1.5% each for CGST + SGST (jewellery standard)

// ════════════════════════════════════════════════════════════════════════
//  CORE FUNCTION
// ════════════════════════════════════════════════════════════════════════

/**
 * Finalize the current cart + payments into a persisted sale.
 *
 * Wraps everything in a single SQLite transaction — if any step fails
 * the entire sale is rolled back automatically.
 *
 * @param {object} customer
 *   { customer_id?, name, phone?, address? }
 * @param {boolean} gstEnabled
 *   Whether to include GST in the bill.
 * @returns {{ bill_id, total, paid, remaining, item_count, status }}
 */
function finalizeSale(customer, gstEnabled = true) {
  // ── 1. Validate cart ────────────────────────────────────────────────
  const cartItems = billing.getCart();

  if (!cartItems || cartItems.length === 0) {
    logger.error('Checkout failed - empty cart');
    throw new Error('Cart is empty. Add items before finalizing the sale.');
  }

  // ── 2. Validate customer ────────────────────────────────────────────
  if (!customer || !customer.name) {
    logger.error('Checkout failed - customer name missing');
    throw new Error('Customer name is required.');
  }

  logger.info('Checkout started', { customerName: customer.name, itemCount: cartItems.length, gstEnabled });

  // ── 3. Validate payments ────────────────────────────────────────────
  const storedPayments = payment.getPayments();

  if (!storedPayments || storedPayments.length === 0) {
    logger.error('Checkout failed - missing payment data');
    throw new Error('At least one payment is required.');
  }

  // ── 4. Validate stock availability ──────────────────────────────────
  for (const item of cartItems) {
    if (item.product_id) {
      const product = stmts.checkStock.get(item.product_id);

      if (!product || product.stock <= 0) {
        logger.error('Checkout failed - critical stock issue', { productId: item.product_id, productName: item.name });
        throw new Error(`Product out of stock: ${item.name}`);
      }
    }
  }

  // ── 5. Compute bill totals ──────────────────────────────────────────
  const currentCartTotal = billing.getCartTotal();
  const makingCharges = round2(
    cartItems.reduce((sum, item) => sum + (item.making_charge || 0), 0)
  );
  const subtotal = round2(currentCartTotal - makingCharges);

  const cgst  = gstEnabled ? round2(currentCartTotal * GST_RATE) : 0;
  const sgst  = gstEnabled ? round2(currentCartTotal * GST_RATE) : 0;
  const totalGst = round2(cgst + sgst);

  const finalNetAmount = round2(currentCartTotal + totalGst);

  // ── 6. Payment summary ──────────────────────────────────────────────
  const totalPaid = payment.getTotalPaid();
  const remaining = round2(finalNetAmount - totalPaid);

  if (remaining < 0) {
    logger.error('Checkout failed - overpayment detected', { totalPaid, finalNetAmount });
    throw new Error('Overpayment detected – total paid exceeds the bill.');
  }

  // ── 7. Generate IDs ────────────────────────────────────────────────
  const bill_id = billNumber.generateBillNumber();
  const now     = new Date().toISOString();

  let finalCustId = customer.customer_id;

  // ── 8. Atomic transaction ──────────────────────────────────────────
  const executeSale = db.transaction(() => {
    
    if (!finalCustId) {
      const existing = db.prepare(`
          SELECT customer_id FROM customers 
          WHERE LOWER(name) = LOWER(?) 
             OR (phone IS NOT NULL AND phone != '' AND phone = ?)
      `).get(customer.name.trim(), customer.phone ? customer.phone.trim() : '');
      
      if (existing) {
          finalCustId = existing.customer_id;
      } else {
          finalCustId = uuidv4();
      }
    }

    // 8a. Upsert customer (ensures FK target exists)
    stmts.upsertCustomer.run({
      customer_id: finalCustId,
      name:        customer.name.trim(),
      phone:       customer.phone ? customer.phone.trim() : null,
      address:     customer.address ? customer.address.trim() : null,
    });

    // 8b. Insert bill
    stmts.insertBill.run({
      bill_id,
      bill_datetime:    now,
      customer_id:      finalCustId,
      customer_name:    customer.name.trim(),
      customer_phone:   customer.phone ? customer.phone.trim() : null,
      customer_address: customer.address ? customer.address.trim() : null,
      subtotal,
      making_charges:   makingCharges,
      cgst_amount:      cgst,
      sgst_amount:      sgst,
      total_gst_amount: totalGst,
      final_net_amount: finalNetAmount,
    });

    // 8c. Insert each cart item as a bill_item
    for (const item of cartItems) {
      stmts.insertBillItem.run({
        id:            uuidv4(),
        bill_id,
        product_id:    item.product_id || null,
        item_name:     item.name,
        gross_weight:  item.gross_weight ?? null,
        stone_weight:  item.stone_weight ?? 0,
        net_weight:    item.net_weight ?? null,
        purity:        item.purity || null,
        rate:          item.rate ?? null,
        making_charge: item.making_charge ?? 0,
        selling_price: item.selling_price ?? 0,
        total:         item.total,
      });
    }

    // 8d. Insert payments (use stored values – no recalculation)
    for (const p of storedPayments) {
      stmts.insertPayment.run({
        id:           p.id,
        bill_id,
        payment_type: p.type,
        amount:       p.amount,
        gold_weight:  p.gold_weight || 0,
        gold_rate:    p.gold_rate || 0,
        created_at:   p.created_at || now,
      });
    }

    // 8e. Create debt record if there is a remaining balance
    if (remaining > 0) {
      stmts.insertDebt.run({
        debt_id:          uuidv4(),
        bill_id,
        customer_id:      finalCustId,
        total_amount:     finalNetAmount,
        paid_amount:      totalPaid,
        remaining_amount: remaining,
        status:           'OPEN',
      });
    }

    // 8f. Reduce stock for every product in the cart
    for (const item of cartItems) {
      if (item.product_id) {
        stmts.reduceStock.run(item.product_id);
      }
    }
  });

  // Run the transaction (auto-rolls back on any error)
  try {
    executeSale();
    
    // 🗄️ Trigger automatic backup after successful sale
    backupSystem.backupDatabase();
  } catch (err) {
    logger.error('Checkout failed - transaction roll-back', { error: err.message, stack: err.stack });
    throw err;
  }

  // ── 9. Cleanup in-memory state ─────────────────────────────────────
  billing.clearCart();
  payment.clearPayments();

  // ── 10. Return complete sale summary for receipt generation ─────────
  const summary = {
    bill_id,
    customer:        { ...customer, name: customer.name.trim(), phone: customer.phone ? customer.phone.trim() : null, customer_id: finalCustId },  // never mutate the input
    items:           cartItems,
    payments:        storedPayments,
    subtotal,
    making_charges:  makingCharges,   // needed by receiptService for correct totals display
    cgst,
    sgst,
    total:           finalNetAmount,
    paid:            totalPaid,
    remaining,
    date:            now,
    status:          'SUCCESS',
  };

  logger.info('Sale completed successfully', { bill_id, total: summary.total });

  return summary;
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  finalizeSale,
};
