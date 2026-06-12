const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// ════════════════════════════════════════════════════════════════════════
//  IN-MEMORY PAYMENTS
// ════════════════════════════════════════════════════════════════════════

let payments = [];

const VALID_TYPES = ['CASH', 'CARD', 'UPI', 'GOLD'];

// ════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════

/** Round a number to 2 decimal places. */
function round2(value) {
  return Math.round(value * 100) / 100;
}


// ════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════

/**
 * Add a payment entry.
 *
 * @param {object} payment
 *   { type: 'CASH'|'CARD'|'UPI'|'GOLD', amount?, gold_weight?, gold_rate? }
 * @param {number} totalBill – the bill's final net amount
 * @returns {object} the stored payment record
 */
function addPayment(payment, totalBill) {
  // ── 1. Basic validation ─────────────────────────────────────────────
  if (!payment || typeof payment !== 'object') {
    logger.error('Payment failed - invalid payment object', { payment });
    throw new Error('Payment object is required.');
  }

  const type = (payment.type || '').toUpperCase();

  if (!VALID_TYPES.includes(type)) {
    const errMsg = `Invalid payment type "${payment.type}". Must be one of: ${VALID_TYPES.join(', ')}`;
    logger.error('Payment addition failed - invalid type', { type: payment.type });
    throw new Error(errMsg);
  }

  if (typeof totalBill !== 'number' || totalBill < 0) {
    throw new Error('totalBill must be a non-negative number.');
  }

  // ── 2. Type-specific validation & amount resolution ─────────────────
  let amount;
  let gold_weight = 0;
  let gold_rate   = 0;

  if (type === 'GOLD') {
    gold_weight = payment.gold_weight;
    gold_rate   = payment.gold_rate;

    if (typeof gold_weight !== 'number' || gold_weight <= 0) {
      throw new Error('Gold payment requires gold_weight > 0.');
    }
    if (typeof gold_rate !== 'number' || gold_rate <= 0) {
      throw new Error('Gold payment requires gold_rate > 0.');
    }

    amount = round2(gold_weight * gold_rate);
  } else {
    amount = payment.amount;

    if (typeof amount !== 'number' || amount <= 0) {
      logger.error('Payment addition failed - invalid amount', { type, amount });
      throw new Error(`${type} payment requires amount > 0.`);
    }

    amount = round2(amount);
  }

  // ── 3. Prevent overpayment ──────────────────────────────────────────
  const remaining = calculateRemaining(totalBill);

  if (amount > round2(remaining + 0.01)) {
    // tiny tolerance for floating-point rounding
    logger.error('Payment addition failed - exceeds balance', { amount, remaining });
    throw new Error(
      `Payment of ₹${amount} exceeds remaining balance of ₹${remaining}.`
    );
  }

  // ── 4. Store payment ────────────────────────────────────────────────
  const record = {
    id: uuidv4(),
    type,
    amount,
    gold_weight,
    gold_rate,
    created_at: new Date().toISOString(),
  };

  payments.push(record);

  logger.info('Payment added successfully', { type, amount });

  // Add warning if payment brings remaining close to zero but not exactly zero
  const newRemaining = calculateRemaining(totalBill);
  if (newRemaining > 0 && newRemaining < 10) {
    logger.warn('Near overpayment condition - small balance remaining', { newRemaining });
  }

  return record;
}

/**
 * Sum of all payment amounts (including gold conversions).
 */
function getTotalPaid() {
  return round2(
    payments.reduce((sum, p) => sum + p.amount, 0)
  );
}

/**
 * Calculate how much is still owed on the bill.
 *
 * @param {number} totalBill
 * @returns {number}
 */
function calculateRemaining(totalBill) {
  if (typeof totalBill !== 'number' || totalBill < 0) {
    throw new Error('totalBill must be a non-negative number.');
  }

  const remaining = round2(totalBill - getTotalPaid());

  if (remaining < 0) {
    throw new Error('Overpayment detected – total paid exceeds the bill.');
  }

  return remaining;
}

/**
 * Return all recorded payments.
 */
function getPayments() {
  return [...payments];
}

/**
 * Reset the payments array.
 */
function clearPayments() {
  payments = [];
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  addPayment,
  getTotalPaid,
  calculateRemaining,
  getPayments,
  clearPayments,
};
