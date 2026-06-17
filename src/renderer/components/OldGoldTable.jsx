import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

const OldGoldTable = ({ payments, onAddOldGold, onRemovePayment, goldRate }) => {
    const [particulars, setParticulars] = useState('');
    const [grossWeight, setGrossWeight] = useState('');
    const [stoneWeight, setStoneWeight] = useState('');
    const [rate, setRate] = useState(goldRate || '');

    const netWeight = Math.max(0, Number(grossWeight || 0) - Number(stoneWeight || 0));
    const value = netWeight * Number(rate || 0);

    const oldGoldItems = payments.filter(p => p.type === 'GOLD');

    const handleAdd = () => {
        if (!particulars || !grossWeight || !rate) return;
        
        onAddOldGold({
            type: 'GOLD',
            particulars,
            gross_weight: Number(grossWeight),
            stone_weight: Number(stoneWeight || 0),
            net_weight: netWeight,
            gold_rate: Number(rate),
            amount: value
        });
        
        setParticulars('');
        setGrossWeight('');
        setStoneWeight('');
        // keep rate as is
    };

    const formatRupees = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', backgroundColor: '#71012b', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#71012b' }}>
                    RECEIPT ENTRY (OLD GOLD EXCHANGE)
                </span>
            </div>

            {/* Input Form Section */}
            <div style={{ 
                background: '#fdfa', 
                border: '1px solid var(--border-color)', 
                borderRadius: '10px', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '2', minWidth: '150px' }}>
                        <Input 
                            label="Particulars"
                            value={particulars} 
                            onChange={e => setParticulars(e.target.value)} 
                            placeholder="E.g. Old Ring" 
                            fullWidth 
                        />
                    </div>
                    <div style={{ flex: '1', minWidth: '100px' }}>
                        <Input 
                            label="Gross Wt (g)"
                            type="number" 
                            value={grossWeight} 
                            onChange={e => setGrossWeight(e.target.value)} 
                            placeholder="0.000" 
                            fullWidth 
                        />
                    </div>
                    <div style={{ flex: '1', minWidth: '100px' }}>
                        <Input 
                            label="Stone Wt (g)"
                            type="number" 
                            value={stoneWeight} 
                            onChange={e => setStoneWeight(e.target.value)} 
                            placeholder="0.000" 
                            fullWidth 
                        />
                    </div>
                    <div style={{ flex: '1', minWidth: '100px' }}>
                        <Input 
                            label="Old Gold Rate (₹/g)"
                            type="number" 
                            value={rate} 
                            onChange={e => setRate(e.target.value)} 
                            placeholder="0.00" 
                            fullWidth 
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Net Weight</span>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#276749' }}>{netWeight.toFixed(3)} g</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Exchange Value</span>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#276749' }}>{formatRupees(value)}</span>
                        </div>
                    </div>
                    
                    <Button 
                        variant="primary" 
                        onClick={handleAdd}
                        disabled={!particulars || !grossWeight || !rate}
                        style={{ padding: '8px 24px' }}
                    >
                        + Add Receipt Entry
                    </Button>
                </div>
            </div>

            {/* Display Table */}
            {oldGoldItems.length > 0 && (
                <div style={{ 
                    background: 'white', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <table className="cart-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                                <th style={{ width: '40px', padding: '12px 8px' }}>#</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Particulars</th>
                                <th style={{ width: '90px', textAlign: 'center', padding: '12px 8px' }}>Gross (g)</th>
                                <th style={{ width: '90px', textAlign: 'center', padding: '12px 8px' }}>Stone (g)</th>
                                <th style={{ width: '90px', textAlign: 'center', padding: '12px 8px' }}>Net (g)</th>
                                <th style={{ width: '110px', textAlign: 'right', padding: '12px 8px' }}>Rate/g (₹)</th>
                                <th style={{ width: '130px', textAlign: 'right', padding: '12px 8px' }}>Value (₹)</th>
                                <th style={{ width: '60px', textAlign: 'center', padding: '12px 8px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {oldGoldItems.map((item, index) => (
                                <tr key={index} className="cart-row" style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 8px' }}>{index + 1}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>{item.particulars || 'Old Gold'}</div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: '500', padding: '12px 8px' }}>{Number(item.gross_weight || item.gold_weight || 0).toFixed(3)}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 8px' }}>{Number(item.stone_weight || 0).toFixed(3)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#276749', padding: '12px 8px' }}>{Number(item.net_weight || item.gold_weight || 0).toFixed(3)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '500', padding: '12px 8px' }}>{Number(item.gold_rate).toFixed(2)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#276749', padding: '12px 8px' }}>{formatRupees(item.amount)}</td>
                                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                                        <button 
                                            onClick={() => onRemovePayment(item.id)}
                                            style={{ 
                                                background: '#fff5f5', 
                                                border: '1px solid #fed7d7', 
                                                color: '#e53e3e', 
                                                width: '28px', 
                                                height: '28px', 
                                                borderRadius: '6px', 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto',
                                                transition: 'all 0.2s ease'
                                            }}
                                            title="Remove item"
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#fed7d7'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#fff5f5'; }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OldGoldTable;
