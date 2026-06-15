const db = require('../database/db');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');
const billNumber = require('./billNumberService');

// ── PREPARED STATEMENTS ───────────────────────────────────────────────
const stmts = {
  getDebt: db.prepare(`
    SELECT d.*, c.name, c.phone, c.address 
    FROM debts d 
    LEFT JOIN customers c ON d.customer_id = c.customer_id 
    WHERE d.debt_id = ?
  `),
  updateDebt: db.prepare(`
    UPDATE debts
       SET paid_amount = ?,
           remaining_amount = ?,
           status = ?
     WHERE debt_id = ?
  `),
  insertDebtTx: db.prepare(`
    INSERT INTO debt_transactions (id, debt_id, payment_type, amount, gold_weight, gold_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  insertPayment: db.prepare(`
    INSERT INTO payments (id, bill_id, payment_type, amount, gold_weight, gold_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
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
  getAllOpen: db.prepare(`
    SELECT 
      d.debt_id, d.bill_id, d.customer_id,
      c.name as customer_name, c.phone as customer_phone,
      d.total_amount, d.paid_amount, d.remaining_amount,
      d.status, d.created_at as debt_date
    FROM debts d
    LEFT JOIN customers c ON d.customer_id = c.customer_id
    WHERE d.status = 'OPEN'
    ORDER BY d.created_at DESC
  `)
};

/**
 * Fetch all active debts.
 */
function getAllDebts() {
  try {
    const debts = stmts.getAllOpen.all();
    logger.info('Fetched all open debts', { count: debts.length });
    return debts;
  } catch (error) {
    logger.error('Failed to fetch debts', { error: error.message });
    throw error;
  }
}

/**
 * Apply a payment toward an existing debt record.
 * @param {string} debt_id
 * @param {object} payment
 */
function applyDebtPayment(debt_id, payment) {
  // Use .immediate to acquire the write lock at the start of the transaction 
  // to avoid deadlocks/conflicts with other potentially concurrent processes.
  const applyPayment = db.transaction((id, p) => {
    // 1. Fetch current record
    const debt = stmts.getDebt.get(id);
    if (!debt) throw new Error('Debt record not found.');
    if (debt.status === 'CLOSED') throw new Error('Debt is already fully paid.');

    // 2. Resolve payment amount
    let amt = 0;
    if (['CASH', 'CARD', 'UPI'].includes(p.payment_type)) {
      amt = parseFloat(p.amount);
    } else if (p.payment_type === 'GOLD') {
      amt = parseFloat(p.gold_weight || 0) * parseFloat(p.gold_rate || 0);
    }

    if (isNaN(amt) || amt <= 0) throw new Error('Invalid payment amount.');

    const roundedAmt = Math.round(amt * 100) / 100;
    if (roundedAmt > (debt.remaining_amount + 0.05)) { // 5 paisa buffer
      throw new Error(`Excess payment: Max ₹${debt.remaining_amount}`);
    }

    // 3. New Balances
    const paid = Math.round((debt.paid_amount + roundedAmt) * 100) / 100;
    const rem  = Math.max(0, Math.round((debt.remaining_amount - roundedAmt) * 100) / 100);
    const stat = rem <= 0 ? 'CLOSED' : 'OPEN';

    // 4. Update Tables
    stmts.updateDebt.run(paid, rem, stat, id);
    
    stmts.insertDebtTx.run(uuidv4(), id, p.payment_type, roundedAmt, p.gold_weight || 0, p.gold_rate || 0);
    
    stmts.insertPayment.run(uuidv4(), debt.bill_id, p.payment_type, roundedAmt, p.gold_weight || 0, p.gold_rate || 0);

    // 5. Generate a New Bill for the Debt Repayment
    const newBillId = billNumber.generateBillNumber();
    const now = new Date().toISOString();

    stmts.insertBill.run({
      bill_id: newBillId,
      bill_datetime: now,
      customer_id: debt.customer_id,
      customer_name: debt.name || 'Unknown',
      customer_phone: debt.phone || null,
      customer_address: debt.address || null,
      subtotal: roundedAmt,
      making_charges: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      total_gst_amount: 0,
      final_net_amount: roundedAmt
    });

    stmts.insertBillItem.run({
      id: uuidv4(),
      bill_id: newBillId,
      product_id: null,
      item_name: `Debt Repayment for Bill #${debt.bill_id}`,
      gross_weight: null,
      stone_weight: 0,
      net_weight: null,
      purity: null,
      rate: roundedAmt,
      making_charge: 0,
      selling_price: roundedAmt,
      total: roundedAmt
    });
    
    stmts.insertPayment.run(uuidv4(), newBillId, p.payment_type, roundedAmt, p.gold_weight || 0, p.gold_rate || 0);

    const summary = {
      bill_id: newBillId,
      customer: { customer_id: debt.customer_id, name: debt.name || 'Unknown', phone: debt.phone || null, address: debt.address || null },
      items: [{ item_name: `Debt Repayment for Bill #${debt.bill_id}`, total: roundedAmt, gross_weight: null, net_weight: null, purity: null, rate: roundedAmt, making_charge: 0, selling_price: roundedAmt }],
      payments: [{ type: p.payment_type, amount: roundedAmt, gold_weight: p.gold_weight, gold_rate: p.gold_rate, created_at: now }],
      subtotal: roundedAmt,
      making_charges: 0,
      cgst: 0,
      sgst: 0,
      total: roundedAmt,
      paid: roundedAmt,
      remaining: 0,
      date: now,
      status: 'SUCCESS'
    };

    return { success: true, remaining: rem, saleResult: summary };
  }).immediate;

  try {
    // Execute synchronous transaction
    const result = applyPayment(debt_id, payment);
    
    logger.info('Applied debt payment', { debt_id, remaining: result.remaining });
    return result;
  } catch (error) {
    logger.error('Debt payment transaction failed', { debt_id, error: error.message });
    throw error; // Let the IPC bridge report the error
  }
}

module.exports = {
  getAllDebts,
  applyDebtPayment,
};
