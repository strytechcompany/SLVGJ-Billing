import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import Button from '../components/Button';

const Reports = () => {
    const [bills, setBills] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            const data = await window.api.reports.getBills();
            setBills(data || []);
        } catch (err) {
            toast.error('Failed to fetch bills: ' + err.message);
        }
    };

    const formatRupees = (val) => {
        return '₹' + Number(val || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const filteredBills = useMemo(() => {
        return bills.filter(b => {
            const matchesSearch = 
                (b.bill_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            let matchesDate = true;
            if (startDate || endDate) {
                const billDate = new Date(b.bill_datetime);
                billDate.setHours(0, 0, 0, 0); // normalize for comparison

                if (startDate) {
                    const s = new Date(startDate);
                    s.setHours(0, 0, 0, 0);
                    if (billDate < s) matchesDate = false;
                }
                if (endDate) {
                    const e = new Date(endDate);
                    e.setHours(23, 59, 59, 999);
                    if (billDate > e) matchesDate = false;
                }
            }
            
            return matchesSearch && matchesDate;
        });
    }, [bills, searchQuery, startDate, endDate]);

    return (
        <Layout>
            <div style={{ padding: '24px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', color: '#71012b', fontFamily: 'var(--font-display)', fontWeight: '600', marginBottom: '4px' }}>Bill Reports</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>View and filter all generated bills</p>
                </div>
            </div>

            <div style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    
                    {/* Top Controls */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}>🔍</div>
                            <input
                                type="text"
                                placeholder="Search by Bill ID or Customer Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '10px 16px 10px 48px', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>From:</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ padding: '9px 12px', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>To:</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ padding: '9px 12px', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)' }}
                            />
                        </div>
                        {(startDate || endDate || searchQuery) && (
                            <Button variant="ghost" onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); }}>
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, textTransform: 'uppercase', fontSize: '11px', color: '#71012b', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px' }}>Date</th>
                                    <th style={{ padding: '12px 16px' }}>Bill ID</th>
                                    <th style={{ padding: '12px 16px' }}>Customer Name</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Subtotal</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Tax (GST)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Final Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No bills found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBills.map(b => (
                                        <tr key={b.bill_id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }} className="search-item-hover">
                                            <td style={{ padding: '14px 16px' }}>{new Date(b.bill_datetime).toLocaleString()}</td>
                                            <td style={{ padding: '14px 16px', fontWeight: '600', color: '#71012b' }}>{b.bill_id}</td>
                                            <td style={{ padding: '14px 16px', fontWeight: '500' }}>{b.customer_name}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{formatRupees(b.subtotal + b.making_charges)}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: '#c53030' }}>+{formatRupees(b.total_gst_amount)}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#276749' }}>{formatRupees(b.final_net_amount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Showing {filteredBills.length} bills
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Reports;
