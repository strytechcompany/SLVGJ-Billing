import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

const PAYMENT_ICONS = { CASH: 'CASH', UPI: 'UPI', CARD: 'CARD', GOLD: 'GOLD' };

const PaymentPanel = ({ subtotal, totalBill, gstEnabled, payments, onAddPayment, onOpenCheckout }) => {
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [goldRate, setGoldRate] = useState('');

  const formatRupees = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAdd = () => {
    const data = { type: method };
    if (method === 'GOLD') {
      data.gold_weight = Number(goldWeight);
      data.gold_rate = Number(goldRate);
      data.amount = Number(goldWeight) * Number(goldRate);
    } else {
      data.amount = Number(amount);
    }
    onAddPayment(data);
    setAmount('');
    setGoldWeight('');
    setGoldRate('');
  };

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const remaining = Math.max(0, totalBill - totalPaid);
  const isFullyPaid = remaining === 0 && totalBill > 0;

  return (
    <div className="payment-panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

      {/* Billing Summary */}
      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '4px', height: '16px', backgroundColor: '#71012b', borderRadius: '2px' }}></div>
          <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#71012b' }}>
            Billing Summary
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div className="flex-between" style={{ padding: '4px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatRupees(subtotal)}</span>
          </div>
          {gstEnabled && (
            <div className="flex-between" style={{ padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>GST (3%)</span>
              <span style={{ fontWeight: '500', color: 'var(--text-muted)', fontSize: '13px' }}>{formatRupees(totalBill - subtotal)}</span>
            </div>
          )}
          <div className="flex-between" style={{ marginTop: '8px', background: '#ffe4e6', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
            <span style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#1a202c' }}>TOTAL</span>
            <span style={{ fontWeight: '800', fontSize: '28px', color: '#71012b' }}>{formatRupees(totalBill)}</span>
          </div>
        </div>
      </div>

      {/* Payment Options */}
      <div className="section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '4px', height: '16px', backgroundColor: '#71012b', borderRadius: '2px' }}></div>
          <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#71012b' }}>
            Payment Options
          </span>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', marginBottom: '16px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {['CASH', 'UPI', 'CARD'].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                background: method === m ? '#71012b' : '#ffffff',
                color: method === m ? 'white' : '#4a5568',
                border: 'none',
                borderRight: '1px solid var(--border-color)',
                borderRadius: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{m}</span>
            </button>
          ))}
        </div>

        {/* Amount input area */}
        <div style={{
          background: 'rgba(253,232,240,0.20)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          marginBottom: '10px'
        }}>
            <Input
              label={`Amount — ${method}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              fullWidth
              placeholder="Enter amount..."
            />
          <Button
            fullWidth
            variant="primary"
            onClick={handleAdd}
            disabled={!amount}
            style={{ marginTop: '4px' }}
          >
            + Add Payment
          </Button>
        </div>

        {/* Payments list */}
        <div className="scroll-area" style={{
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '8px 10px',
          background: 'white',
          minHeight: '60px'
        }}>
          {payments.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              No payments recorded yet
            </div>
          ) : (
            payments.map((p, i) => (
              <div key={i} className="flex-between" style={{
                padding: '8px 4px',
                borderBottom: i < payments.length - 1 ? '1px solid var(--border-color)' : 'none',
                fontSize: '13px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: '500' }}>
                  {/* <span>{PAYMENT_ICONS[p.type]}</span> */}
                  <span>{p.type}{p.type === 'GOLD' ? ` · ${p.gold_weight}g` : ''}</span>
                </span>
                <span style={{ fontWeight: '700', color: 'var(--primary-hover)' }}>{formatRupees(p.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Remaining + Finalize */}
      <div style={{ marginTop: 'auto' }}>
        <div className="flex-between" style={{
          padding: '14px 16px',
          borderRadius: '10px',
          background: isFullyPaid ? '#f0fff4' : '#fff5f7',
          border: `1px solid ${isFullyPaid ? '#9ae6b4' : '#fed7e2'}`,
          marginBottom: '10px'
        }}>
          <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: isFullyPaid ? '#276749' : '#71012b' }}>Remaining</span>
          <span style={{
            fontWeight: '800',
            fontSize: '20px',
            color: isFullyPaid ? '#276749' : '#71012b'
          }}>
            {formatRupees(remaining)}
          </span>
        </div>
        <Button fullWidth variant="primary" size="large" onClick={onOpenCheckout} style={{ padding: '16px', backgroundColor: '#71012b', border: 'none', borderRadius: '8px', fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '700' }}>
          FINALIZE SALE
        </Button>
      </div>
    </div>
  );
};

export default PaymentPanel;
