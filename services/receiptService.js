// ════════════════════════════════════════════════════════════════════════
//  Receipt Service – generates a print-ready HTML receipt
// ════════════════════════════════════════════════════════════════════════

// ── Shop configuration (edit these for your store) ────────────────────
const SHOP = {
  name:    'SRI LAKSHMI JEWELLERS',
  address: '123, Gold Bazaar Road, T. Nagar, Chennai - 600017',
  phone:   '+91 98765 43210',
  gstin:   '33AABCU9603R1ZM',   // set to null to hide
  logo:    null,                // set to a path/URL e.g. 'logo.png' to show
};

// ── Helpers ───────────────────────────────────────────────────────────

/** Format a number as Indian rupees with commas — e.g. ₹ 1,23,456.00 */
function rupees(value) {
  return `₹ ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a weight value to 3 decimals with 'g' suffix. */
function grams(value) {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(3)}g`;
}

/** Format an ISO date string into a human-readable form. */
function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate a complete, self-contained HTML receipt string.
 *
 * @param {object} saleData
 *   { bill_id, customer, items[], payments[], subtotal, cgst, sgst,
 *     total, paid, remaining, date }
 * @returns {string} Full HTML document ready for printing
 */
function generateReceiptHTML(saleData) {
  const {
    bill_id,
    customer = {},
    items = [],
    payments = [],
    subtotal,
    making_charges = 0,
    cgst,
    sgst,
    total,
    paid,
    remaining,
    date,
  } = saleData;

  // ── Item rows (with empty-cart fallback) ────────────────────────────
  const itemRows = items.length
    ? items.map((item, i) => `
      <tr>
        <td style="text-align:left;padding:4px 6px;">${i + 1}.</td>
        <td style="text-align:left;padding:4px 6px;">${item.name || item.item_name || '-'}</td>
        <td style="text-align:center;padding:4px 6px;">${grams(item.gross_weight)}</td>
        <td style="text-align:center;padding:4px 6px;">${grams(item.stone_weight)}</td>
        <td style="text-align:center;padding:4px 6px;">${grams(item.net_weight)}</td>
        <td style="text-align:right;padding:4px 6px;">${rupees(item.rate)}</td>
        <td style="text-align:right;padding:4px 6px;">${rupees(item.making_charge)}</td>
        <td style="text-align:right;padding:4px 6px;font-weight:600;">${rupees(item.total)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" style="text-align:center;padding:10px;color:#888;">No items</td></tr>';

  // ── Receipt (Old Gold) rows ─────────────────────────────────────────
  const oldGoldPayments = payments.filter((p) => p.type === 'GOLD' || p.payment_type === 'GOLD');
  const otherPayments = payments.filter((p) => p.type !== 'GOLD' && p.payment_type !== 'GOLD');

  const oldGoldRows = oldGoldPayments.length
    ? oldGoldPayments.map((p, i) => {
        const w = p.gold_weight || 0;
        const r = p.gold_rate || 0;
        return `
        <tr>
          <td style="text-align:left;padding:4px 6px;">${i + 1}.</td>
          <td style="text-align:left;padding:4px 6px;">Old Gold (Exchange)</td>
          <td style="text-align:center;padding:4px 6px;">${grams(w)}</td>
          <td style="text-align:center;padding:4px 6px;">-</td>
          <td style="text-align:center;padding:4px 6px;">${grams(w)}</td>
          <td style="text-align:right;padding:4px 6px;">${rupees(r)}</td>
          <td style="text-align:right;padding:4px 6px;">-</td>
          <td style="text-align:right;padding:4px 6px;font-weight:600;">${rupees(p.amount)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center;padding:10px;color:#888;">No old gold exchanged</td></tr>';

  const paymentRows = otherPayments.map((p) => {
    return `
      <tr>
        <td style="padding:3px 6px;">${p.type || p.payment_type}</td>
        <td style="padding:3px 6px;text-align:right;">${rupees(p.amount)}</td>
      </tr>
    `;
  }).join('');

  // ── Optional elements ───────────────────────────────────────────────
  const gstinLine = SHOP.gstin
    ? `<p style="margin:2px 0;font-size:11px;">GSTIN: ${SHOP.gstin}</p>`
    : '';

  const logoLine = SHOP.logo
    ? `<img src="${SHOP.logo}" alt="${SHOP.name}" height="40" style="margin-bottom:4px;" /><br>`
    : '';

  // ── Full HTML ───────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt – ${bill_id}</title>
  <style>
    @page {
      size: 5.8in 8.3in;
      margin: 10px;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
      width: 5.8in;
      padding: 12px;
      line-height: 1.4;
    }
    table { width: 100%; border-collapse: collapse; }
    tr { page-break-inside: avoid; }
    .divider {
      border: none;
      border-top: 1px dashed #888;
      margin: 8px 0;
    }
    .divider-bold {
      border: none;
      border-top: 2px solid #333;
      margin: 8px 0;
    }
  </style>
</head>
<body>

  <!-- ═══════ HEADER ═══════ -->
  <div style="text-align:center;margin-bottom:6px;">
    ${logoLine}
    <h1 style="font-size:18px;margin:0 0 2px 0;letter-spacing:1px;">${SHOP.name}</h1>
    <p style="margin:2px 0;font-size:11px;">${SHOP.address}</p>
    <p style="margin:2px 0;font-size:11px;">Phone: ${SHOP.phone}</p>
    ${gstinLine}
  </div>

  <hr class="divider-bold">

  <!-- ═══════ BILL INFO ═══════ -->
  <table style="margin-bottom:4px;">
    <tr>
      <td style="padding:2px 0;"><strong>Bill No:</strong> ${bill_id}</td>
    </tr>
    <tr>
      <td style="padding:2px 0;"><strong>Date:</strong> ${formatDate(date)}</td>
    </tr>
    <tr>
      <td style="padding:2px 0;"><strong>Customer:</strong> ${customer.name || '-'}</td>
    </tr>
    <tr>
      <td style="padding:2px 0;"><strong>Phone:</strong> ${customer.phone || '-'}</td>
    </tr>
  </table>

  <hr class="divider">

  <!-- ═══════ ISSUE DETAILS ═══════ -->
  <p style="font-weight:bold;margin-bottom:4px;font-size:11px;">ISSUE DETAILS (SALES)</p>
  <table>
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="text-align:left;padding:4px 6px;font-size:11px;">#</th>
        <th style="text-align:left;padding:4px 6px;font-size:11px;">Item</th>
        <th style="text-align:center;padding:4px 6px;font-size:11px;">Gross</th>
        <th style="text-align:center;padding:4px 6px;font-size:11px;">Stone</th>
        <th style="text-align:center;padding:4px 6px;font-size:11px;">Net</th>
        <th style="text-align:right;padding:4px 6px;font-size:11px;">Rate/g</th>
        <th style="text-align:right;padding:4px 6px;font-size:11px;">Making</th>
        <th style="text-align:right;padding:4px 6px;font-size:11px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="divider">

  <!-- ═══════ RECEIPT DETAILS ═══════ -->
  <p style="font-weight:bold;margin-bottom:4px;font-size:11px;">RECEIPT DETAILS (OLD GOLD / EXCHANGE)</p>
  <table>
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="text-align:left;padding:4px 6px;font-size:11px;">#</th>
        <th style="text-align:left;padding:4px 6px;font-size:11px;">Particulars</th>
        <th style="text-align:center;padding:4px 6px;font-size:11px;">Gross</th>
        <th style="text-align:center;padding:4px 6px;font-size:11px;">Stone</th>
        <th style="text-align:center;padding:4px 6px;font-size:11px;">Net</th>
        <th style="text-align:right;padding:4px 6px;font-size:11px;">Rate/g</th>
        <th style="text-align:right;padding:4px 6px;font-size:11px;">-</th>
        <th style="text-align:right;padding:4px 6px;font-size:11px;">Value</th>
      </tr>
    </thead>
    <tbody>
      ${oldGoldRows}
    </tbody>
  </table>

  <hr class="divider">

  <!-- ═══════ TOTAL SECTION ═══════ -->
  <table>
    <tr>
      <td style="padding:3px 6px;">Subtotal (Metal)</td>
      <td style="padding:3px 6px;text-align:right;">${rupees(subtotal)}</td>
    </tr>
    ${making_charges > 0 ? `
    <tr>
      <td style="padding:3px 6px;color:#555;">Making Charges</td>
      <td style="padding:3px 6px;text-align:right;color:#555;">${rupees(making_charges)}</td>
    </tr>` : ''}
    ${(cgst > 0 || sgst > 0) ? `
    <tr>
      <td style="padding:3px 6px;color:#555;">CGST (1.5%)</td>
      <td style="padding:3px 6px;text-align:right;color:#555;">${rupees(cgst)}</td>
    </tr>
    <tr>
      <td style="padding:3px 6px;color:#555;">SGST (1.5%)</td>
      <td style="padding:3px 6px;text-align:right;color:#555;">${rupees(sgst)}</td>
    </tr>
    ` : ''}
  </table>
  <hr class="divider-bold">
  <table>
    <tr>
      <td style="padding:4px 6px;font-size:14px;"><strong>TOTAL AMOUNT</strong></td>
      <td style="padding:4px 6px;text-align:right;font-size:14px;"><strong>${rupees(total)}</strong></td>
    </tr>
  </table>

  <hr class="divider">

  <!-- ═══════ PAYMENT SECTION ═══════ -->
  <p style="font-weight:bold;margin-bottom:4px;font-size:11px;">OTHER PAYMENTS</p>
  <table>
    ${paymentRows || '<tr><td style="color:#888;">No added cash/card payments.</td></tr>'}
  </table>

  <hr class="divider">

  <!-- ═══════ BALANCE SECTION ═══════ -->
  <table>
    <tr>
      <td style="padding:3px 6px;"><strong>Total Paid</strong></td>
      <td style="padding:3px 6px;text-align:right;"><strong>${rupees(paid)}</strong></td>
    </tr>
    <tr>
      <td style="padding:3px 6px;color:${Number(remaining) > 0 ? '#c00' : '#060'};">
        <strong>Balance Due</strong>
      </td>
      <td style="padding:3px 6px;text-align:right;color:${Number(remaining) > 0 ? '#c00' : '#060'};font-weight:bold;">
        ${rupees(remaining)}
      </td>
    </tr>
  </table>

  <hr class="divider-bold">

  <!-- ═══════ FOOTER ═══════ -->
  <div style="text-align:center;margin-top:10px;font-size:11px;">
    <p style="margin:4px 0;font-weight:bold;">Thank you for your purchase!</p>
    <p style="margin:2px 0;color:#555;">Goods once sold will not be taken back without this bill.</p>
    <p style="margin:2px 0;color:#555;">Terms &amp; conditions apply.</p>
  </div>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="text-align:center;margin-top:16px;">
    <button onclick="window.print()"
      style="padding:8px 24px;font-size:13px;cursor:pointer;
             border:1px solid #333;background:#333;color:#fff;
             border-radius:4px;">
      🖨️ Print Receipt
    </button>
  </div>

</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  generateReceiptHTML,
};
