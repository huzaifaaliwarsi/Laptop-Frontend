'use client';

import React, { useState, useEffect } from 'react';
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
  const [activeInvoice, setActiveInvoice] = useState(invoice);

  useEffect(() => {
    if (!invoice) {
      setActiveInvoice(null);
      return;
    }
    setActiveInvoice(invoice);

    // If invoice lacks line items or has empty items, fetch complete populated invoice from backend
    const hasItems = Array.isArray(invoice.items) && invoice.items.length > 0;
    const invId = invoice.id || invoice.invoiceNo || invoice.invoice_no;

    if (!hasItems && invId) {
      api.get(`/invoices/${invId}`).then(res => {
        if (res.success && res.data) {
          setActiveInvoice(res.data);
        }
      }).catch(err => {
        console.warn('Could not re-fetch full invoice items:', err);
      });
    }
  }, [invoice]);

  if (!activeInvoice) return null;

  const currentInv = activeInvoice;
  const config = getTransactionConfig(currentInv.type || currentInv.typeKey, currentInv);
  const total = parseFloat(currentInv.total || 0);
  const paid = parseFloat(currentInv.paid || 0);
  const balance = Math.max(0, parseFloat(currentInv.balance || 0));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const baseUrl = backendUrl.replace(/\/+$/, '');
    const finalUrl = baseUrl.endsWith('/api') ? `${baseUrl}/invoices/${currentInv.id}/pdf` : `${baseUrl}/api/invoices/${currentInv.id}/pdf`;
    window.open(finalUrl, '_blank');
  };

  const handleWhatsApp = async () => {
    const rawContact = currentInv.contact;
    const phone = String(rawContact || '').replace(/\D/g, '');
    if (!phone) {
      toast('No contact number is available on this invoice.', 'error');
      return;
    }

    setSendingWa(true);
    try {
      const res = await api.post(`/invoices/${currentInv.id}/send-whatsapp`);
      if (res.data?.delivered) {
        toast(`✅ Invoice PDF sent to WhatsApp (${res.data.contact || phone})!`);
      } else if (res.data?.wa_not_connected) {
        toast('WhatsApp device not connected. Opening WhatsApp Web...', 'info');
        const normalized = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
        const msg = `${companyBranding?.company_name || 'Retail & Repair Management'}\n${config.title}: ${currentInv.invoiceNo || currentInv.trackingId || currentInv.id}\nTotal: PKR ${numStr(total)}\nPaid: PKR ${numStr(paid)}\nBalance: PKR ${numStr(balance)}\nThank you for choosing us!`;
        window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        toast(res.data?.message || 'Invoice logged in WhatsApp CRM', 'info');
      }
    } catch (err) {
      console.warn('Backend WhatsApp dispatch error, opening WhatsApp web:', err);
      toast('Opening WhatsApp Web...', 'info');
      const normalized = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
      const msg = `${companyBranding?.company_name || 'Retail & Repair Management'}\n${config.title}: ${currentInv.invoiceNo || currentInv.trackingId || currentInv.id}\nTotal: PKR ${numStr(total)}\nPaid: PKR ${numStr(paid)}\nBalance: PKR ${numStr(balance)}\nThank you for choosing us!`;
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
      subtitle={currentInv.invoiceNo || currentInv.trackingId || currentInv.id}
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
          {currentInv.type === 'Sales Invoice' && !currentInv.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(currentInv)}
            >
              Void / Return Sale
            </button>
          )}
          {currentInv.type === 'Vendor Purchase' && !currentInv.isVoided && onVendorReturn && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVendorReturn(currentInv)}
            >
              Return / Refund to Vendor
            </button>
          )}
          {currentInv.type === 'Customer Purchase' && !currentInv.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(currentInv)}
            >
              Void / Revert Buyback
            </button>
          )}
          {(currentInv.type === 'Exchange Invoice' || currentInv.type === 'Product Exchange') && !currentInv.isVoided && onVoidSale && (
            <button
              type="button"
              className="btn danger"
              onClick={() => onVoidSale(currentInv)}
            >
              Void / Revert Exchange
            </button>
          )}
        </div>
      }
    >
      {currentInv.isVoided && (
        <div className="notice no-print" style={{ marginBottom: 14, borderLeftColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)' }}>
          <strong>REFUNDED / VOIDED:</strong>&nbsp; {currentInv.voidReason || 'Returned'} · Refund PKR {numStr(currentInv.refundAmount || currentInv.total)} via {currentInv.refundMethod || 'Vendor Return'}
        </div>
      )}

      {/* Universal Dynamic Invoice Layout */}
      <InvoiceLayout
        invoice={currentInv}
        companyBranding={companyBranding}
      />
    </Modal>
  );
}
