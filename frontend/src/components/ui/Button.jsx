import React from 'react';
import './Button.css';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  className = '', 
  ...props 
}) {
  return (
    <button 
      className={`btn btn-${variant} btn-${size} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="btn-spinner" size={16} />}
      {!isLoading && children}
    </button>
  );
}
