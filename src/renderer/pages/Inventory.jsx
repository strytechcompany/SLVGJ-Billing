import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import Button from '../components/Button';

const Inventory = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const data = await window.api.inventory.getAll();
            setProducts(data || []);
        } catch (err) {
            toast.error('Failed to fetch inventory: ' + err.message);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await window.api.inventory.sync();
            if (res.success) {
                toast.success(`Synced ${res.count} products from external database!`);
                await fetchInventory();
            }
        } catch (err) {
            toast.error('Failed to sync: ' + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const formatRupees = (val) => {
        return '₹' + Number(val || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            (p.name || '').toLowerCase().includes(q) ||
            (p.barcode || '').toLowerCase().includes(q) ||
            (p.purity || '').toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

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
                        fontFamily: 'var(--font-display)',
                        fontWeight: '600',
                        marginBottom: '4px'
                    }}>Inventory Management</h1>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        fontWeight: '500'
                    }}>View and sync external stock data</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                        variant="primary" 
                        style={{ backgroundColor: '#71012b', display: 'flex', gap: '8px', alignItems: 'center' }} 
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? '🔄 Syncing...' : '🔄 Sync External DB'}
                    </Button>
                </div>
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
                    overflow: 'hidden'
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
                            placeholder="Search by Product Name, Barcode, or Purity..."
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
                                    <th style={{ padding: '12px 16px' }}>BARCODE</th>
                                    <th style={{ padding: '12px 16px' }}>NAME</th>
                                    <th style={{ padding: '12px 16px' }}>PURITY</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>GROSS WT</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>NET WT</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>MAKING</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>BUYING COST</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>STOCK</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No products found. Click "Sync External DB" to import stock.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map(p => (
                                        <tr key={p.product_id} style={{ 
                                            borderBottom: '1px solid var(--border-color)',
                                            fontSize: '13px'
                                        }}
                                        className="search-item-hover"
                                        >
                                            <td style={{ padding: '14px 16px', fontWeight: '600' }}>{p.barcode || p.product_id}</td>
                                            <td style={{ padding: '14px 16px' }}>{p.name}</td>
                                            <td style={{ padding: '14px 16px' }}>{p.purity}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{p.gross_weight || 0}g</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{p.net_weight || 0}g</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{formatRupees(p.making_charge)}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: '#276749', fontWeight: '600' }}>{formatRupees(p.buying_price)}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    backgroundColor: p.stock > 0 ? '#c6f6d5' : '#fed7e2', 
                                                    color: p.stock > 0 ? '#22543d' : '#822727', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '12px', 
                                                    fontWeight: '700' 
                                                }}>
                                                    {p.stock}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Showing {filteredProducts.length > 0 ? 1 : 0}-{filteredProducts.length} of {filteredProducts.length} items
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Inventory;
