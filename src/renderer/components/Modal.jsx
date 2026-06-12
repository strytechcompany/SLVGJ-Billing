import React from 'react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex-between" style={{ marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#71012b', letterSpacing: '0.3px', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
            style={{
              fontSize: '20px',
              background: 'none',
              color: '#4a5568',
              border: 'none',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div className="modal-body" style={{ marginBottom: '22px' }}>
          {children}
        </div>

        {footer && (
          <div className="modal-footer" style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '18px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
