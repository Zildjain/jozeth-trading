import React from 'react';

export default function Button({ children, variant = 'primary', size = 'md', type = 'button', onClick, disabled = false, className = '' }) {
  return <button type={type} className={`button button--${variant} button--${size} ${className}`.trim()} onClick={onClick} disabled={disabled}>{children}</button>;
}
