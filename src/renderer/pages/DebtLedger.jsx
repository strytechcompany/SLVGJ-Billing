import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Input from '../components/Input';

const DebtLedger = () => {
    const navigate = useNavigate();
    const [debts, setDebts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [activeDebt, setActiveDebt] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentAmount, setPaymentAmount] = useState('');
    
    // Fetch debts on mount
    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        try {
            const data = await window.api.debts.getDebts();
            setDebts(data || []);
        } catch (err) {
            toast.error('Failed to fetch debts: ' + err.message);
        }
    };

    const formatRupees = (val) => {
        return '₹' + Number(val).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const filteredDebts = useMemo(() => {
        if (!searchQuery.trim()) return debts;
        const q = searchQuery.toLowerCase();
        return debts.filter(d => 
            (d.bill_id || '').toLowerCase().includes(q) ||
            (d.customer_name || '').toLowerCase().includes(q) ||
            (d.customer_phone || '').toLowerCase().includes(q)
        );
    }, [debts, searchQuery]);

    const openPaymentModal = (debt) => {
        setActiveDebt(debt);
        setPaymentAmount(debt.remaining_amount);
        setPaymentMethod('CASH');
        setIsPaymentModalOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setActiveDebt(null);
        setPaymentAmount('');
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!activeDebt) return;

        try {
            const paymentData = {
                payment_type: paymentMethod,
                amount: Number(paymentAmount)
            };
            
            const res = await window.api.debts.applyDebtPayment(activeDebt.debt_id, paymentData);
            if (res.success) {
                toast.success('Payment applied successfully');
                closePaymentModal();
                fetchDebts();
            }
        } catch (err) {
            toast.error(err.message || 'Payment failed');
        }
    };

    return (
        <Layout hideSidebar={false}>
            {/* Header Area */}
            <div style={{
                padding: '24px 32px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '24px',
                        color: '#71012b',
                        fontFamily: 'var(--font-pos)',
                        fontWeight: '600',
                        marginBottom: '4px'
                    }}>Debt Ledger</h1>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        fontWeight: '500'
                    }}>Tracking outstanding balances for customers</p>
                </div>
                <Button 
                    variant="primary" 
                    style={{ backgroundColor: '#4a5568', boxShadow: 'none' }} 
                    onClick={() => navigate('/pos')}
                >
                    ← Back to Billing
                </Button>
            </div>

            {/* Main Content Area */}
            <div style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden' // for the table to scroll inside
                }}>
                    
                    {/* Search Bar */}
                    <div style={{ marginBottom: '20px', position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#a0aec0'
                        }}>
                            🔍
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Bill No or Customer Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 48px',
                                border: '1.5px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                outline: 'none',
                                color: 'var(--text-main)'
                            }}
                        />
                    </div>

                    {/* Table */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{
                                position: 'sticky',
                                top: 0,
                                backgroundColor: 'white',
                                zIndex: 1,
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                color: '#71012b',
                                fontWeight: '700',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <tr>
                                    <th style={{ padding: '12px 16px' }}>BILL ID</th>
                                    <th style={{ padding: '12px 16px' }}>CUSTOMER</th>
                                    <th style={{ padding: '12px 16px' }}>PHONE</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>TOTAL</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>PAID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>REMAINING</th>
                                    <th style={{ padding: '12px 16px' }}>DATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDebts.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No debts found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDebts.map(debt => (
                                        <tr key={debt.debt_id} style={{ 
                                            borderBottom: '1px solid var(--border-color)',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => openPaymentModal(debt)}
                                        className="search-item-hover"
                                        >
                                            <td style={{ padding: '14px 16px', fontWeight: '600' }}>{debt.bill_id}</td>
                                            <td style={{ padding: '14px 16px' }}>{debt.customer_name || '--'}</td>
                                            <td style={{ padding: '14px 16px' }}>{debt.customer_phone || '--'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{formatRupees(debt.total_amount)}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{formatRupees(debt.paid_amount)}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: '#71012b', fontWeight: '700' }}>{formatRupees(debt.remaining_amount)}</td>
                                            <td style={{ padding: '14px 16px' }}>{formatDate(debt.debt_date)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Showing {filteredDebts.length > 0 ? 1 : 0}-{Math.min(5, filteredDebts.length)} of {filteredDebts.length} records
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={closePaymentModal}
                title="Collect Payment"
                footer={null} // custom footer inside form
            >
                {activeDebt && (
                    <form onSubmit={handlePaymentSubmit}>
                        {/* Outstanding Balance Box */}
                        <div style={{
                            backgroundColor: '#ffe4e6', // light pink matching the image
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#71012b', marginBottom: '4px' }}>
                                {formatRupees(activeDebt.remaining_amount)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9f1239', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Outstanding Balance
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71012b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                Payment Method
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    backgroundColor: 'white',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <option value="CASH">CASH</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">CARD</option>
                            </select>
                        </div>

                        {/* Amount Received */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71012b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                Amount Received (₹)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={activeDebt.remaining_amount}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                            <button
                                type="button"
                                onClick={closePaymentModal}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    backgroundColor: '#f7fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    color: '#4a5568',
                                    cursor: 'pointer'
                                }}
                            >
                                Dismiss
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    backgroundColor: '#71012b',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Submit Payment
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </Layout>
    );
};

export default DebtLedger;
