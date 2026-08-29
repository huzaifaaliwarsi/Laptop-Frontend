'use client';

import React from 'react';
import Modal from '../../common/Modal';
import { useAuth } from '../../../context/AuthContext';
import InvoiceLayout from './InvoiceLayout';
import { money, numStr, getTransactionConfig } from '../../../utils/formatters';

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  onVoidSale,
  onVendorReturn
}) {
  const { companyBranding } = useAuth();

  if (!invoice) return null;

  const config = getTransactionConfig(invoice.type || invoice.typeKey, invoice);
  const total = parseFloat(invoice.total || 0);
  const paid = parseFloat(invoice.paid || 0);
  const balance = Math.max(0, parseFloat(invoice.balance || 0));

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const phone = String(invoice.contact || '').replace(/\D/g, '');
    if (!phone) {
      alert('No contact number is available on this invoice.');
      return;
    }
    const normalized = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
    const msg = `${companyBranding.company_name || 'Retail & Repair Management'}\n${config.title}: ${invoice.invoiceNo || invoice.trackingId || invoice.id}\nTotal: PKR ${numStr(total)}\nPaid: PKR ${numStr(paid)}\nBalance: PKR ${numStr(balance)}\nThank you for choosing us!`;
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title || "Invoice Preview"}
      subtitle={invoice.invoiceNo || invoice.trackingId || invoice.id}
      wide={true}
      isInvoice={true}
      footer={
        <div className="invoice-action-footer">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn" onClick={handlePrint} id="printInvoiceBtn">
            Print Invoice
          </button>
          <button type="button" className="btn primary" onClick={handlePrint} id="pdfInvoiceBtn">
            Save as PDF
          </button>
          <button type="button" className="btn success" onClick={handleWhatsApp} id="whatsappInvoiceBtn">
            Send on WhatsApp
          </button>
          {invoice.type === 'Sales Invoice' && !invoice.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(invoice)}
            >
              Void / Return
            </button>
          )}
          {invoice.type === 'Vendor Purchase' && !invoice.isVoided && onVendorReturn && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVendorReturn(invoice)}
            >
              Return / Refund to Vendor
            </button>
          )}
        </div>
      }
    >
      {invoice.isVoided && (
        <div className="notice no-print" style={{ marginBottom: 14, borderLeftColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)' }}>
          <strong>REFUNDED / VOIDED:</strong>&nbsp; {invoice.voidReason || 'Returned'} · Refund PKR {numStr(invoice.refundAmount || invoice.total)} via {invoice.refundMethod || 'Vendor Return'}
        </div>
      )}

      {/* Universal Dynamic Invoice Layout */}
      <InvoiceLayout
        invoice={invoice}
        companyBranding={companyBranding}
      />
    </Modal>
  );
}
