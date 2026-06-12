import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', // primary (pink) | outline (pink-border) | ghost
  className = '', 
  disabled = false, 
  type = 'button',
  fullWidth = false,
  size = 'medium',
  style = {}
}) => {
  const getClassName = () => {
    let base = `btn-common ${className}`;
    if (variant === 'primary') base += ' btn-primary';
    if (variant === 'outline') base += ' btn-outline';
    return base;
  };

  const customStyles = {
    width: fullWidth ? '100%' : 'auto',
    padding: size === 'small' ? '8px 16px' : size === 'large' ? '18px 25px' : '12px 20px',
    fontSize: size === 'small' ? '12px' : size === 'large' ? '17px' : '14px',
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...style
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      style={customStyles}
      disabled={disabled}
      className={getClassName()}
    >
      {children}
    </button>
  );
};

export default Button;
