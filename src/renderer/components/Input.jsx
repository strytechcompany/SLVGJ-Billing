import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = '',
  name = '',
  onKeyDown,
  required = false,
  fullWidth = false,
  autoFocus = false,
  disabled = false
}, ref) => {
  return (
    <div className={`input-group ${className}`} style={{ width: fullWidth ? '100%' : 'auto', marginBottom: '14px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: '600',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          color: 'var(--text-muted)'
        }}>
          {label} {required && <span style={{ color: 'var(--primary-deep)' }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        name={name}
        autoFocus={autoFocus}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '11px 14px',
          fontSize: '14px',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--radius-input)',
          outline: 'none',
          backgroundColor: disabled ? 'var(--bg-light)' : '#ffffff',
          fontFamily: 'var(--font-pos)',
          color: 'var(--text-main)',
          fontWeight: '500'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary-deep)';
          e.target.style.boxShadow = '0 0 0 3px rgba(196, 30, 94, 0.12)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
});

export default Input;
