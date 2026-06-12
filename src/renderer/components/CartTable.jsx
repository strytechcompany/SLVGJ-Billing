import React from 'react';

const CartTable = ({ items, onRemove, onClear }) => {
  const formatRupees = (val) => `₹${Number(val).toFixed(2)}`;
  const formatWeight = (val) => `${Number(val).toFixed(3)}g`;

  // Compute profit/loss for an item
  const getProfitLoss = (item) => {
    const buying = Number(item.buying_price) || 0;
    const selling = Number(item.selling_price) || Number(item.total) || 0;
    if (buying === 0) return null; // No buying price recorded
    return Math.round((selling - buying) * 100) / 100;
  };

  // Total profit/loss across all cart items
  const totalProfitLoss = items.reduce((sum, item) => {
    const pl = getProfitLoss(item);
    return pl !== null ? sum + pl : sum;
  }, 0);
  const hasProfitData = items.some(item => getProfitLoss(item) !== null);

  return (
    <div className="cart-table-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #71012b', // To emulate the section title divider
        padding: '0 0 10px 0',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '16px', backgroundColor: '#71012b', borderRadius: '2px' }}></div>
          <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#71012b' }}>
            Shopping Cart
          </span>
          <span style={{
            color: '#718096',
            fontSize: '12px',
            fontWeight: '500',
          }}>
            ({items.length} items)
          </span>
        </div>
        <button
          onClick={onClear}
          style={{
            fontSize: '11px',
            padding: '5px 12px',
            background: '#fff0f3',
            border: '1px solid #fed7e2',
            color: '#e53e6a',
            borderRadius: '6px',
            fontWeight: '600',
            letterSpacing: '0.3px',
            cursor: 'pointer'
          }}
        >
          CLEAR ALL
        </button>
      </div>

      <div className="scroll-area">
        {items.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            color: 'var(--text-muted)',
            gap: '12px'
          }}>
            <div style={{ fontSize: '40px', opacity: 0.5 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
              Cart is empty
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7, textAlign: 'center' }}>
              Scan a barcode or search to add items
            </div>
          </div>
        ) : (
          <>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#718096' }}>#</th>
                <th style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#718096' }}>ITEM DESCRIPTION</th>
                <th style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#718096' }}>WEIGHT (G)</th>
                <th style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#718096' }}>RATE/G (₹)</th>
                <th style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#718096' }}>MAKING (₹)</th>
                <th style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#718096', textAlign: 'right' }}>TOTAL (₹)</th>
                <th style={{ padding: '10px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const profitLoss = getProfitLoss(item);
                const isProfit = profitLoss !== null && profitLoss >= 0;
                const isLoss = profitLoss !== null && profitLoss < 0;

                return (
                <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-main)' }}>{index + 1}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Code: {item.product_id?.slice(-6) || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                    {Number(item.gross_weight).toFixed(3)}
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                    {Number(item.rate).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                    {Number(item.making_charge).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: '700', textAlign: 'right', color: 'var(--text-main)' }}>
                    {Number(item.total).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => onRemove(index)}
                      style={{
                        background: '#fff0f3',
                        color: '#e53e6a',
                        padding: '5px 9px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '700',
                        border: '1px solid rgba(229,62,106,0.2)',
                        lineHeight: 1
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

          {/* Total Profit/Loss Summary Bar */}
          {hasProfitData && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '12px 16px',
              marginTop: '8px',
              borderRadius: '10px',
              background: totalProfitLoss >= 0
                ? 'linear-gradient(135deg, #f0fff4, #e6ffed)'
                : 'linear-gradient(135deg, #fff5f5, #fff0f0)',
              border: `1.5px solid ${totalProfitLoss >= 0 ? '#9ae6b4' : '#feb2b2'}`,
              gap: '12px',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: totalProfitLoss >= 0 ? '#276749' : '#c0392b',
              }}>
                {totalProfitLoss >= 0 ? 'Total Profit' : 'Total Loss'}
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: '800',
                color: totalProfitLoss >= 0 ? '#276749' : '#c0392b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  {totalProfitLoss >= 0 ? (
                    <polyline points="18 15 12 9 6 15"></polyline>
                  ) : (
                    <polyline points="6 9 12 15 18 9"></polyline>
                  )}
                </svg>
                {totalProfitLoss >= 0 ? '+' : ''}{formatRupees(totalProfitLoss)}
              </span>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default CartTable;
