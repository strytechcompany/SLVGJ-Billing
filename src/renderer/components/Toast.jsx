import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  const styles = {
    backgroundColor: isSuccess ? '#f0fff4' : '#fff8fa',
    color: isSuccess ? '#276749' : '#9E1549',
    border: `1px solid ${isSuccess ? '#9ae6b4' : '#FADADD'}`,
    padding: '11px 18px',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: isSuccess
      ? '0 4px 14px rgba(39, 103, 73, 0.08)'
      : '0 4px 14px rgba(158, 21, 73, 0.08)',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: '260px',
    maxWidth: '360px',
    animation: 'fadeIn 0.25s ease-out forwards'
  };

  return (
    <div style={styles}>
      <span style={{ lineHeight: '1.4' }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          fontWeight: '700',
          marginLeft: '12px',
          cursor: 'pointer',
          fontSize: '16px',
          color: 'inherit',
          opacity: 0.7,
          lineHeight: 1,
          padding: '2px 4px'
        }}
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div style={{ position: 'fixed', top: '18px', right: '18px', zIndex: 99999 }}>
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
