import React from 'react';
import Layout from '../components/Layout';

const Placeholder = ({ title }) => {
    return (
        <Layout hideSidebar={false}>
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%', 
                padding: '40px',
                backgroundColor: 'var(--bg-light)',
                borderRadius: '8px',
                margin: '24px'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
                <h2 style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#71012b', 
                    marginBottom: '8px',
                    fontFamily: 'var(--font-display)'
                }}>
                    {title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '16px', textAlign: 'center' }}>
                    This feature is currently under development. Please check back later!
                </p>
            </div>
        </Layout>
    );
};

export default Placeholder;
