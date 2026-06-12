import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('slj_authenticated');
        navigate('/');
    };

    const navItems = [
        { name: 'Billing', path: '/pos', icon: '🧾' },
        { name: 'Debt Ledger', path: '/debts', icon: '📒' },
        { name: 'Inventory', path: '/inventory', icon: '💎' },
        { name: 'Customers', path: '/customers', icon: '👥' },
        { name: 'Reports', path: '/reports', icon: '📊' }
    ];

    return (
        <aside style={{
            width: '260px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            boxShadow: 'var(--shadow-sm)'
        }}>
            {/* Header / Logo */}
            <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h1 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--primary-deep)',
                    fontFamily: 'var(--font-display)',
                    marginBottom: '4px',
                    letterSpacing: '0.5px'
                }}>
                    Sri Lakshmi Jewellers
                </h1>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Station #01 | Admin
                </div>
            </div>

            {/* New Bill Button */}
            <div style={{ padding: '20px' }}>
                <button
                    onClick={() => navigate('/pos')}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#71012b', /* Deep Red from mockup */
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 10px rgba(113, 1, 43, 0.3)',
                        cursor: 'pointer'
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> New Bill
                </button>
            </div>

            {/* Navigation Links */}
            <nav style={{ flex: 1, padding: '0 12px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.name}>
                                <NavLink
                                    to={item.path}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        color: isActive ? 'white' : 'var(--text-main)',
                                        backgroundColor: isActive ? '#71012b' : 'transparent',
                                        fontWeight: isActive ? '600' : '500',
                                        fontSize: '14px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {/* Temporary text emojis instead of SVGs for simplicity, matching layout */}
                                    <span style={{ 
                                        filter: isActive ? 'brightness(0) invert(1)' : 'grayscale(100%) opacity(0.7)',
                                        display: 'inline-block',
                                        width: '20px',
                                        textAlign: 'center'
                                    }}>
                                        {item.icon}
                                    </span>
                                    {item.name}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom Links */}
            <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <NavLink
                    to="/settings"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'var(--text-main)',
                        fontWeight: '500',
                        fontSize: '14px'
                    }}
                >
                    <span style={{ filter: 'grayscale(100%) opacity(0.7)', width: '20px', textAlign: 'center' }}>⚙️</span>
                    Settings
                </NavLink>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'var(--text-main)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontWeight: '500',
                        fontSize: '14px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ filter: 'grayscale(100%) opacity(0.7)', width: '20px', textAlign: 'center' }}>🚪</span>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
