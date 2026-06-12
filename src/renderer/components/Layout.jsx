import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, hideSidebar = false }) => {
    return (
        <div style={{ 
            display: 'flex', 
            height: '100vh', 
            width: '100vw', 
            overflow: 'hidden',
            backgroundColor: 'var(--bg-light)' // Light pink background
        }}>
            {!hideSidebar && <Sidebar />}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {children}
            </div>
        </div>
    );
};

export default Layout;
