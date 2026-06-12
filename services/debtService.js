const db = require('../database/db');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

// ── PREPARED STATEMENTS ───────────────────────────────────────────────
const stmts = {
  getDebt: db.prepare('SELECT * FROM debts WHERE debt_id = ?'),
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

    return { success: true, remaining: rem };
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
