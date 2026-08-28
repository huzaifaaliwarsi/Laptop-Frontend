'use client';

import React, { useEffect } from 'react';
import { useToast } from './Toast';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  isInvoice = false
}) {
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      toast('Use Cancel or × to close this form. Your entered data is protected.');
    }
  };

  return (
    <div
      className={`modal-backdrop open ${isInvoice ? 'invoice-modal' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-foot">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
