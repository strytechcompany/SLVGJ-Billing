const db = require('../database/db');

// ════════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════════════════════════

const PREFIX     = 'BILL';
const PAD_LENGTH = 4;     // sequence digits → BILL-2026-0001

// ════════════════════════════════════════════════════════════════════════
//  PREPARED STATEMENTS
// ════════════════════════════════════════════════════════════════════════

const stmts = {
  latestBillForYear: db.prepare(`
    SELECT bill_id FROM bills
     WHERE bill_id LIKE ?
     ORDER BY bill_id DESC
     LIMIT 1
  `),

  billExists: db.prepare(`
    SELECT 1 FROM bills WHERE bill_id = ? LIMIT 1
  `),
};

// ════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════

/**
 * Extract the numeric sequence from a bill_id string.
 * e.g. "BILL-2026-0042" → 42
 *
 * Returns 0 if parsing fails, so the next sequence becomes 1.
 */
function extractSequence(billId) {
  if (!billId || typeof billId !== 'string') return 0;

  const parts = billId.split('-');
  const last  = parts[parts.length - 1];
  const num   = parseInt(last, 10);

  return Number.isNaN(num) ? 0 : num;
}

/**
 * Pad a number to the configured digit length.
 * e.g.  7 → "0007"
 */
function padSequence(seq) {
  return String(seq).padStart(PAD_LENGTH, '0');
}

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate the next sequential bill number for the current year.
 *
 * Format:  BILL-YYYY-XXXX
 * Example: BILL-2026-0001, BILL-2026-0002, …
 *
 * The generation and duplicate check are wrapped in a transaction
 * to ensure atomicity when multiple calls happen in quick succession.
 *
 * @returns {string} e.g. "BILL-2026-0001"
 */
function generateBillNumber() {
  const year    = new Date().getFullYear();
  const pattern = `${PREFIX}-${year}-%`;

  // Wrap in a transaction for atomic read-then-generate
  const generate = db.transaction(() => {
    // 1. Fetch the latest bill_id for this year
    const row = stmts.latestBillForYear.get(pattern);

    // 2. Determine next sequence
    const lastSeq = row ? extractSequence(row.bill_id) : 0;
    let nextSeq   = lastSeq + 1;

    // 3. Build the bill number
    let billNumber = `${PREFIX}-${year}-${padSequence(nextSeq)}`;

    // 4. Safety: if it somehow already exists, keep incrementing
    const MAX_ITERATIONS = 200;
    let iterations = 0;
    while (stmts.billExists.get(billNumber)) {
      nextSeq++;
      billNumber = `${PREFIX}-${year}-${padSequence(nextSeq)}`;
      if (++iterations > MAX_ITERATIONS) {
        throw new Error(
          'Bill number generation exceeded limit. Database may be corrupted.'
        );
      }
    }

    return billNumber;
  });

  return generate();
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  generateBillNumber,
};
