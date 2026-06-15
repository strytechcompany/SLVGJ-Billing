import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import Button from '../components/Button';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const data = await window.api.customers.getAll();
            setCustomers(data || []);
        } catch (err) {
            toast.error('Failed to fetch customers: ' + err.message);
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await window.api.customers.add(formData);
            toast.success('Customer added successfully!');
            setShowModal(false);
            setFormData({ name: '', phone: '', address: '' });
            fetchCustomers();
        } catch (err) {
            toast.error(err.message || 'Failed to add customer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').includes(searchQuery)
    );

    return (
        <Layout>
            <div style={{ padding: '24px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', color: '#71012b', fontFamily: 'var(--font-display)', fontWeight: '600', marginBottom: '4px' }}>Customer Directory</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Manage your store's customers</p>
                </div>
                <Button variant="primary" style={{ backgroundColor: '#71012b' }} onClick={() => setShowModal(true)}>
                    + Add Customer
                </Button>
            </div>

            <div style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    
                    <div style={{ marginBottom: '20px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}>🔍</div>
                        <input
                            type="text"
                            placeholder="Search by Name or Phone Number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px 12px 48px', border: '1.5px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, textTransform: 'uppercase', fontSize: '11px', color: '#71012b', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px' }}>Name</th>
                                    <th style={{ padding: '12px 16px' }}>Phone Number</th>
                                    <th style={{ padding: '12px 16px' }}>Address</th>
                                    <th style={{ padding: '12px 16px' }}>Added On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map(c => (
                                        <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }} className="search-item-hover">
                                            <td style={{ padding: '14px 16px', fontWeight: '600' }}>{c.name}</td>
                                            <td style={{ padding: '14px 16px' }}>{c.phone || '-'}</td>
                                            <td style={{ padding: '14px 16px' }}>{c.address || '-'}</td>
                                            <td style={{ padding: '14px 16px' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Customer Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', width: '400px', maxWidth: '90%' }}>
                        <h2 style={{ margin: '0 0 24px', color: '#71012b', fontSize: '20px' }}>Add New Customer</h2>
                        <form onSubmit={handleAddCustomer}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Full Name *</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Phone Number</label>
                                <input 
                                    type="text" 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Address</label>
                                <textarea 
                                    value={formData.address} 
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', minHeight: '60px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={isSubmitting} style={{ backgroundColor: '#71012b' }}>
                                    {isSubmitting ? 'Saving...' : 'Save Customer'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Customers;
