'use client';

import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
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
  const { toast } = useToast();
  const [sendingWa, setSendingWa] = useState(false);

  if (!invoice) return null;

  const config = getTransactionConfig(invoice.type || invoice.typeKey, invoice);
  const total = parseFloat(invoice.total || 0);
  const paid = parseFloat(invoice.paid || 0);
  const balance = Math.max(0, parseFloat(invoice.balance || 0));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const baseUrl = backendUrl.replace(/\/+$/, '');
    const finalUrl = baseUrl.endsWith('/api') ? `${baseUrl}/invoices/${invoice.id}/pdf` : `${baseUrl}/api/invoices/${invoice.id}/pdf`;
    window.open(finalUrl, '_blank');
  };

  const handleWhatsApp = async () => {
    const rawContact = invoice.contact;
    const phone = String(rawContact || '').replace(/\D/g, '');
    if (!phone) {
      toast('No contact number is available on this invoice.', 'error');
      return;
    }

    setSendingWa(true);
    try {
      const res = await api.post(`/invoices/${invoice.id}/send-whatsapp`);
      if (res.data?.delivered) {
        toast(`✅ Invoice PDF sent to WhatsApp (${res.data.contact || phone})!`);
      } else if (res.data?.wa_not_connected) {
        toast('WhatsApp device not connected. Opening WhatsApp Web...', 'info');
        const normalized = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
        const msg = `${companyBranding?.company_name || 'Retail & Repair Management'}\n${config.title}: ${invoice.invoiceNo || invoice.trackingId || invoice.id}\nTotal: PKR ${numStr(total)}\nPaid: PKR ${numStr(paid)}\nBalance: PKR ${numStr(balance)}\nThank you for choosing us!`;
        window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        toast(res.data?.message || 'Invoice logged in WhatsApp CRM', 'info');
      }
    } catch (err) {
      console.warn('Backend WhatsApp dispatch error, opening WhatsApp web:', err);
      toast('Opening WhatsApp Web...', 'info');
      const normalized = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
      const msg = `${companyBranding?.company_name || 'Retail & Repair Management'}\n${config.title}: ${invoice.invoiceNo || invoice.trackingId || invoice.id}\nTotal: PKR ${numStr(total)}\nPaid: PKR ${numStr(paid)}\nBalance: PKR ${numStr(balance)}\nThank you for choosing us!`;
      window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`, '_blank');
    } finally {
      setSendingWa(false);
    }
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
          <button type="button" className="btn primary" onClick={handleDownloadPdf} id="pdfInvoiceBtn">
            Download PDF
          </button>
          <button
            type="button"
            className="btn success"
            onClick={handleWhatsApp}
            id="whatsappInvoiceBtn"
            disabled={sendingWa}
          >
            {sendingWa ? 'Sending WhatsApp PDF...' : 'Send on WhatsApp'}
          </button>
          {invoice.type === 'Sales Invoice' && !invoice.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(invoice)}
            >
              Void / Return Sale
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
          {invoice.type === 'Customer Purchase' && !invoice.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(invoice)}
            >
              Void / Revert Buyback
            </button>
          )}
          {(invoice.type === 'Exchange Invoice' || invoice.type === 'Product Exchange') && !invoice.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(invoice)}
            >
              Void / Revert Exchange
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
