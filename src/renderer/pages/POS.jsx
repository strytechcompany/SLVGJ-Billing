import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import CartTable from '../components/CartTable';
import PaymentPanel from '../components/PaymentPanel';
import Modal from '../components/Modal';
import Layout from '../components/Layout';

const POS = () => {
    const navigate = useNavigate();

    // ── CART STATE ─────────────────────────────────────────────────────
    const [cart, setCart]         = useState([]);
    const [subtotal, setSubtotal] = useState(0);
    const [total, setTotal]       = useState(0);

    // ── PAYMENT STATE ──────────────────────────────────────────────────
    const [payments, setPayments]     = useState([]);
    const [totalPaid, setTotalPaid]   = useState(0);

    // ── UI STATE ───────────────────────────────────────────────────────
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(0); // 0=Closed, 1=Form, 2=Summary
    const [customer, setCustomer]             = useState({ name: '', phone: '', address: '' });
    const [lastSaleResult, setLastSaleResult] = useState(null);
    const [receiptHtml, setReceiptHtml]       = useState('');
    const [isPreviewOpen, setIsPreviewOpen]   = useState(false);
    const [backupStats, setBackupStats]       = useState({ count: 0, totalSizeMB: 0 });
    const [searchQuery, setSearchQuery]       = useState('');
    const [searchResults, setSearchResults]   = useState([]);
    const [gstEnabled, setGstEnabled]         = useState(false);
    const [currentView, setCurrentView]       = useState('cart'); // 'cart' | 'payment'

    // ── CONFIRMATION MODAL STATE ───────────────────────────────────────
    const [confirmProduct, setConfirmProduct] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen]   = useState(false);
    const [sellingPrice, setSellingPrice]     = useState('');

    const scannerBuffer = useRef('');
    const lastKeyTime   = useRef(0);
    const searchTimeout = useRef(null);

    // ── INITIAL DATA LOAD & GLOBAL SCANNER ────────────────────────────
    useEffect(() => {
        refreshData();
    }, [gstEnabled]);

    useEffect(() => {
        refreshData();

        const handleGlobalKeyDown = (e) => {
            const now = Date.now();

            if (e.key === 'Enter') {
                if (scannerBuffer.current.length >= 3) {
                    processBarcode(scannerBuffer.current);
                    scannerBuffer.current = '';
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
                if (!isInputActive || (now - lastKeyTime.current < 50)) {
                    scannerBuffer.current += e.key;
                }
            }

            lastKeyTime.current = now;
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        const interval = setInterval(refreshData, 30000);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            clearInterval(interval);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── HELPERS ────────────────────────────────────────────────────────
    const processBarcode = async (code) => {
        try {
            const product = await window.api.billing.getProductByBarcode(code);
            setConfirmProduct(product);
            setSellingPrice(product.price_per_gram != null ? String(product.price_per_gram) : '');
            setIsConfirmOpen(true);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const refreshData = async () => {
        try {
            const [stats, currentCart, currentTotal, currentPayments, currentPaid] =
                await Promise.all([
                    window.api.backup.getBackupStats(),
                    window.api.billing.getCart(),
                    window.api.billing.getCartTotal(),
                    window.api.payment.getPayments(),
                    window.api.payment.getTotalPaid(),
                ]);

            setBackupStats(stats);
            setCart(currentCart);
            setPayments(currentPayments);
            setTotalPaid(currentPaid);
            setSubtotal(currentTotal);

            if (gstEnabled) {
                const cgst         = Math.round(currentTotal * 0.015 * 100) / 100;
                const sgst         = Math.round(currentTotal * 0.015 * 100) / 100;
                const totalWithGst = Math.round((currentTotal + cgst + sgst) * 100) / 100;
                setTotal(totalWithGst);
            } else {
                setTotal(currentTotal);
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    // ── BILLING ACTIONS ────────────────────────────────────────────────
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (query.trim().length > 0) {
            searchTimeout.current = setTimeout(async () => {
                try {
                    const results = await window.api.billing.searchProducts(query);
                    setSearchResults(results);
                } catch (err) {
                    console.error('Search error:', err);
                }
            }, 200);
        } else {
            setSearchResults([]);
        }
    };

    const showConfirm = (product) => {
        setConfirmProduct(product);
        setSellingPrice(product.price_per_gram != null ? String(product.price_per_gram) : '');
        setIsConfirmOpen(true);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleConfirmAdd = async () => {
        if (!confirmProduct) return;

        // Validate selling price before sending to backend
        const priceVal = sellingPrice !== '' ? Number(sellingPrice) : null;
        if (priceVal !== null && (Number.isNaN(priceVal) || priceVal < 0)) {
            toast.error('Selling price must be a valid non-negative number.');
            return;
        }

        try {
            await window.api.billing.addToCartManual(
                confirmProduct.product_id,
                null,
                priceVal
            );
            toast.success(`Added ${confirmProduct.name} to cart`);
            setIsConfirmOpen(false);
            setConfirmProduct(null);
            refreshData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRemoveItem = async (index) => {
        try {
            await window.api.billing.removeFromCart(index);
            refreshData();
            toast.success('Item removed from cart');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleClearCart = async () => {
        try {
            await window.api.billing.clearCart();
            await window.api.payment.clearPayments();
            refreshData();
            toast.success('Cart & payments cleared');
        } catch (err) {
            toast.error(err.message);
        }
    };

    // ── PAYMENT ACTIONS ────────────────────────────────────────────────
    const handleAddPayment = async (data) => {
        try {
            await window.api.payment.addPayment(data, total);
            refreshData();
            toast.success('Payment recorded');
        } catch (err) {
            toast.error(err.message);
        }
    };

    // ── CHECKOUT ACTIONS ───────────────────────────────────────────────
    const handleFinalize = async () => {
        if (!customer.name.trim()) {
            toast.error('Customer name is required');
            return;
        }
        try {
            const result = await window.api.checkout.finalizeSale(customer, gstEnabled);
            setLastSaleResult(result);
            setIsCheckoutOpen(2);
            toast.success('Sale completed successfully!');
            const html = await window.api.receipt.generateHTML(result);
            setReceiptHtml(html);
            setSearchQuery('');
            setSearchResults([]);
            refreshData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleWhatsApp = () => {
        if (!lastSaleResult?.customer?.phone) {
            toast.error('Customer phone number missing');
            return;
        }
        let phone = lastSaleResult.customer.phone.replace(/\D/g, '');
        if (phone.length === 10) phone = '91' + phone;
        const text =
            `*SRI LAKSHMI JEWELLERS*\n\n` +
            `Bill No: ${lastSaleResult.bill_id}\n` +
            `Total Amount: ₹${lastSaleResult.total}\n` +
            `Paid: ₹${lastSaleResult.paid}\n` +
            `Balance Due: ₹${lastSaleResult.remaining}\n\n` +
            `Thank you for shopping with us!`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handlePrint = async () => {
        try {
            await window.api.print.printReceipt(receiptHtml);
            toast.success('Printing receipt...');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleBackup = async () => {
        try {
            const filePath = await window.api.backup.backupDatabase();
            toast.success(`Database backed up successfully`);
            refreshData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleExcelExport = async () => {
        try {
            const filePath = await window.api.backup.exportToExcel();
            toast.success(`Excel exported: ${filePath.split(/[\\/]/).pop()}`);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('slj_authenticated');
        navigate('/');
    };

    // ── Estimated total in confirm modal (safe against null values) ────
    const getEstimatedTotal = () => {
        if (!confirmProduct) return 0;
        const gw   = confirmProduct.gross_weight  ?? 0;
        const sw   = confirmProduct.stone_weight  ?? 0;
        const mc   = confirmProduct.making_charge ?? 0;
        const rate = Number(sellingPrice) || confirmProduct.price_per_gram || 0;
        const net  = Math.max(0, gw - sw);
        return Math.round((net * rate + mc) * 100) / 100;
    };

    const getMargin = () => {
        if (!confirmProduct || !confirmProduct.buying_price) return null;
        return Math.round((getEstimatedTotal() - confirmProduct.buying_price) * 100) / 100;
    };

    // ── RENDER ──────────────────────────────────────────────────────────
    return (
        <Layout hideSidebar={false}>
        <div className="pos-app animate-fade">

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <header className="app-header flex-between" style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#71012b', fontSize: '24px', display: 'flex', alignItems: 'center' }}>
                        💎 {/* Placeholder for diamond icon */}
                    </div>
                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#71012b',
                        fontFamily: 'var(--font-display)',
                        lineHeight: 1
                    }}>
                        Sri Lakshmi Jewellers
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {/* Backup stats */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#718096', fontWeight: '700' }}>Database | Storage</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a202c' }}>{backupStats.count} Backups | {backupStats.totalSizeMB} MB</div>
                        </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={() => navigate('/debts')}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', 
                                borderRadius: '6px', color: '#4a5568', fontWeight: '600', fontSize: '13px', cursor: 'pointer' 
                            }}
                        >
                            📒 DEBTS
                        </button>
                        <button
                            onClick={handleBackup}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', backgroundColor: '#fff5f7', border: '1px solid #fed7e2', 
                                borderRadius: '6px', color: '#71012b', fontWeight: '600', fontSize: '13px', cursor: 'pointer' 
                            }}
                        >
                            🔄 SYNC BACKUP
                        </button>
                        <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#4a5568' }}>
                            🔔
                        </button>
                    </div>
                </div>
            </header>

            <main className="pos-layout">
                {/* ── LEFT PANEL ────────────────────────────────────────── */}
                <section className="panel panel-left">

                    {/* Product Search */}
                    <div className="section" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '16px', backgroundColor: '#71012b', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#71012b' }}>
                                SEARCH SHOP
                            </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Input
                                label="FIND PRODUCT"
                                placeholder="Type to search..."
                                fullWidth
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoComplete="off"
                            />
                            {searchResults.length > 0 && (
                                <div className="search-dropdown animate-fade" style={{
                                    position: 'absolute',
                                    top: 'calc(100% - 14px)',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1.5px solid var(--primary-xlight)',
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 28px rgba(196,30,94,0.14)',
                                    zIndex: 9999,
                                    maxHeight: '280px',
                                    overflowY: 'auto'
                                }}>
                                    {searchResults.map(p => (
                                        <div
                                            key={p.product_id}
                                            onClick={() => showConfirm(p)}
                                            style={{
                                                padding: '11px 14px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border-color)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            className="search-item-hover"
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>{p.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.purity} · Stock: {p.stock}</div>
                                            </div>
                                            <div style={{ fontWeight: '700', color: 'var(--primary-deep)', fontSize: '13px' }}>₹{p.price_per_gram}/g</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scanner Status */}
                    <div className="section">
                        <div style={{
                            background: 'var(--bg-light)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px dashed var(--primary-xlight)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '10px', color: '#71012b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px', fontWeight: '700' }}>
                                SCANNER STATUS
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#71012b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#71012b', borderRadius: '50%' }}></div> ACTIVE & READY
                            </div>
                        </div>
                    </div>

                    {/* GST Toggle */}
                    <div className="section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '16px', backgroundColor: '#71012b', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#71012b' }}>
                                SET BILL OPTIONS
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: gstEnabled ? 'rgba(196,30,94,0.08)' : '#f8f9fa',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: `1.5px solid ${gstEnabled ? 'var(--primary-deep)' : 'var(--border-color)'}`,
                            transition: 'all 0.3s ease'
                        }}>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: gstEnabled ? 'var(--primary-deep)' : 'var(--text-main)' }}>
                                    GST (3%)
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {gstEnabled ? 'CGST 1.5% + SGST 1.5%' : 'Tax-free bill'}
                                </div>
                            </div>
                            <div
                                onClick={() => setGstEnabled(!gstEnabled)}
                                style={{
                                    width: '44px',
                                    height: '24px',
                                    background: gstEnabled ? 'var(--primary-deep)' : '#d1d5db',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background 0.25s ease',
                                    flexShrink: 0
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '3px',
                                    left: gstEnabled ? '23px' : '3px',
                                    transition: 'left 0.25s ease',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)'
                                }} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CENTER PANEL ─────────────────────────────────────── */}
                <section className="panel panel-center" style={{ display: 'flex', flexDirection: 'column' }}>
                    <CartTable items={cart} onRemove={handleRemoveItem} onClear={handleClearCart} />
                </section>

                {/* ── RIGHT PANEL (PAYMENT) ──────────────────────────────── */}
                <section className="panel panel-right">
                    <PaymentPanel
                        subtotal={subtotal}
                        totalBill={total}
                        gstEnabled={gstEnabled}
                        payments={payments}
                        onAddPayment={handleAddPayment}
                        onOpenCheckout={() => setIsCheckoutOpen(1)}
                    />
                </section>
            </main>

            {/* ── CONFIRMATION MODAL ───────────────────────────────────── */}
            <Modal
                isOpen={isConfirmOpen}
                onClose={() => { setIsConfirmOpen(false); setConfirmProduct(null); }}
                title="CONFIRM ADD TO CART"
                footer={
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                        <Button variant="outline" fullWidth onClick={() => { setIsConfirmOpen(false); setConfirmProduct(null); }} style={{ color: '#71012b', borderColor: '#fbcfe8', backgroundColor: 'white' }}>CANCEL</Button>
                        <Button variant="primary" fullWidth onClick={handleConfirmAdd} style={{ backgroundColor: '#71012b' }}>✓ ADD ITEM</Button>
                    </div>
                }
            >
                {confirmProduct && (() => {
                    const estimatedTotal = getEstimatedTotal();
                    const margin         = getMargin();
                    const isProfit       = margin !== null && margin >= 0;

                    return (
                        <div>
                            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#718096', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>
                                    SELECTED PRODUCT
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#71012b' }}>
                                    {confirmProduct.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                                    {confirmProduct.purity} Jewellery
                                </div>
                            </div>

                            <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#fff5f7', border: 'none', borderLeft: '3px solid #71012b' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '700' }}>GROSS WEIGHT</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>{(confirmProduct.gross_weight ?? 0)}g</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '700' }}>NET WEIGHT</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                                            {Math.max(0, (confirmProduct.gross_weight ?? 0) - (confirmProduct.stone_weight ?? 0))}g
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '700' }}>MAKING CHARGE</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>₹{confirmProduct.making_charge ?? 0}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '700' }}>RATE PER GRAM</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>₹{sellingPrice || confirmProduct.price_per_gram || 0}</div>
                                    </div>
                                </div>

                                {/* Estimated Total */}
                                <div style={{
                                    marginTop: '24px',
                                    paddingTop: '20px',
                                    borderTop: '1px solid #fed7e2',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        ESTIMATED TOTAL
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#71012b' }}>
                                        ₹{estimatedTotal}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ── CHECKOUT MODAL ─────────────────────────────────────── */}
            <Modal
                isOpen={isCheckoutOpen === 1}
                onClose={() => setIsCheckoutOpen(0)}
                title="Customer Details"
                footer={<Button variant="primary" fullWidth size="large" onClick={handleFinalize}>Confirm & Save Bill</Button>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Input label="Full Name" value={customer.name} onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))} required fullWidth placeholder="Customer's full name" />
                    <Input label="Phone" value={customer.phone} onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))} fullWidth placeholder="Phone number" />
                    <Input label="Address" value={customer.address} onChange={(e) => setCustomer(prev => ({ ...prev, address: e.target.value }))} fullWidth placeholder="Address (optional)" />
                </div>
            </Modal>

            {/* ── SUCCESS MODAL ──────────────────────────────────────── */}
            <Modal
                isOpen={isCheckoutOpen === 2}
                onClose={() => { setIsCheckoutOpen(0); handleClearCart(); }}
                title="Sale Completed"
                footer={<Button fullWidth onClick={() => { setIsCheckoutOpen(0); handleClearCart(); }}>Close & New Bill</Button>}
            >
                <div className="highlight-box" style={{ textAlign: 'center', marginBottom: '22px', padding: '24px' }}>
                    <div style={{ fontSize: '44px', marginBottom: '12px', color: '#276749' }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: '6px' }}>Bill Number</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-deep)', fontFamily: 'var(--font-display)' }}>
                        {lastSaleResult?.bill_id}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Total Bill</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>₹{lastSaleResult?.total}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Paid</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#276749' }}>₹{lastSaleResult?.paid}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <Button variant="outline" fullWidth onClick={() => setIsPreviewOpen(true)}>Preview</Button>
                    <Button variant="outline" style={{ color: '#25D366', borderColor: '#25D366' }} fullWidth onClick={handleWhatsApp}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        &nbsp;WhatsApp
                    </Button>
                    <Button variant="primary" fullWidth onClick={handlePrint}>Print Receipt</Button>
                </div>
            </Modal>

            {/* ── RECEIPT PREVIEW ────────────────────────────────────── */}
            {isPreviewOpen && (
                <div className="modal-overlay" onClick={() => setIsPreviewOpen(false)}>
                    <div className="modal-content" style={{ width: '820px', padding: '0', borderRadius: '16px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            background: 'linear-gradient(135deg, #e8829a, #c4638a)',
                            padding: '14px 24px',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontWeight: '700', letterSpacing: '0.5px', fontSize: '14px' }}>Receipt Preview</span>
                            <button onClick={() => setIsPreviewOpen(false)} style={{ background: 'none', color: 'white', fontSize: '22px', opacity: 0.85 }}>×</button>
                        </div>
                        <div style={{ height: '74vh', background: 'var(--accent-pink)' }}>
                            <iframe
                                title="Receipt"
                                srcDoc={receiptHtml}
                                style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                            />
                        </div>
                        <div style={{ padding: '16px 24px', background: 'white', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
                            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                            <Button variant="primary" style={{ padding: '12px 48px' }} onClick={handlePrint}>Print Now</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </Layout>
    );
};

export default POS;
