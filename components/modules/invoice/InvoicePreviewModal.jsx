'use client';

import React from 'react';
import Modal from '../../common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import FbrLogo from './FbrLogo';
import { amountInWordsPKR } from '../../../utils/numberToWords';

function numStr(v) {
  const n = parseFloat(v || 0);
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateDMY(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getInvoiceTitle(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('tax')) return 'SALES TAX INVOICE';
  if (t.includes('vendor') || t.includes('purchase')) return 'PURCHASE INVOICE';
  if (t.includes('buyback') || t.includes('customer purchase')) return 'BUYBACK INVOICE';
  if (t.includes('exchange')) return 'EXCHANGE INVOICE';
  if (t.includes('repair')) return 'REPAIR INVOICE';
  if (t.includes('diagnosis')) return 'DIAGNOSIS INVOICE';
  if (t.includes('custom')) return 'CUSTOM SALE INVOICE';
  return 'SALES TAX INVOICE';
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  onVoidSale,
  onVendorReturn
}) {
  const { companyBranding } = useAuth();

  if (!invoice) return null;

  const items = invoice.items || [];
  const status = invoice.isVoided ? 'Voided / Refunded' : (invoice.paymentStatus || 'Unpaid');
  const invoiceTotal = parseFloat(invoice.total || 0);
  const paid = parseFloat(invoice.paid || 0);
  const balance = Math.max(0, parseFloat(invoice.balance || 0));

  // Compute item level sums
  let grossAmount = 0;
  let totalDiscount = 0;
  items.forEach(item => {
    const qty = parseFloat(item.quantity || 1);
    const rate = parseFloat(item.rate || item.unitPrice || 0);
    const disc = parseFloat(item.discount || 0);
    const amt = parseFloat(item.amount || (qty * rate));
    grossAmount += amt;
    totalDiscount += disc;
  });

  if (grossAmount === 0 && invoiceTotal > 0) {
    grossAmount = invoiceTotal;
  }

  const taxAmount = parseFloat(invoice.taxAmount || 0);
  const totalExcludingTax = grossAmount - totalDiscount;
  const totalIncludingTax = invoiceTotal > 0 ? invoiceTotal : (totalExcludingTax + taxAmount);

  // Dynamic QR payload
  const qrData = JSON.stringify({
    inv: invoice.invoiceNo,
    dt: fmtDateDMY(invoice.date),
    tot: totalIncludingTax,
    party: invoice.partyName || 'Customer',
    fbr: invoice.fbrInvoiceNo || undefined
  });

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
    const msg = `${companyBranding.company_name || 'Retail Management'}\n${invoice.type || 'Invoice'}: ${invoice.invoiceNo}\nTotal: PKR ${numStr(totalIncludingTax)}\nPaid: PKR ${numStr(paid)}\nBalance: PKR ${numStr(balance)}\nThank you for your business.`;
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Preview"
      subtitle={invoice.invoiceNo}
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
          <strong>REFUNDED / VOIDED:</strong>&nbsp; {invoice.voidReason || 'Returned'} · {fmtDateDMY(invoice.voidDate)} · Refund PKR {numStr(invoice.refundAmount || invoice.total)} via {invoice.refundMethod || 'Vendor Return'}
        </div>
      )}

      {/* Reference Image Layout Container */}
      <div className="ref-invoice-container" id="printableInvoice">
        
        {/* 1. Top Header */}
        <div className="ref-top-header">
          <h1 className="ref-company-title">
            {companyBranding.company_name || 'INNOVATIVE WATER TECHNOLOGY & SOLUTION'}
          </h1>
          
          <div className="ref-header-info-grid">
            <div className="ref-header-left">
              {companyBranding.address && (
                <div className="ref-company-address">{companyBranding.address}</div>
              )}
              {companyBranding.phone && (
                <div className="ref-company-phone">Tel: {companyBranding.phone}</div>
              )}
              {companyBranding.email && (
                <div className="ref-company-email">Email: {companyBranding.email}</div>
              )}
            </div>

            <div className="ref-header-right">
              <div className="ref-tax-field-row">
                <span className="ref-tax-label">NTN #</span>
                <span className="ref-tax-value">{companyBranding.ntn || companyBranding.tax_number || '—'}</span>
              </div>
              <div className="ref-tax-field-row">
                <span className="ref-tax-label">STRN #</span>
                <span className="ref-tax-value">{companyBranding.strn || '—'}</span>
              </div>
              <div className="ref-tax-field-row">
                <span className="ref-tax-label">POS ID #</span>
                <span className="ref-tax-value">{companyBranding.pos_id || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Meta Bar & Title */}
        <div className="ref-meta-bar">
          <div className="ref-meta-left">
            <div className="ref-meta-item">
              <span className="ref-italic">Invoice No.</span>
              <strong>{invoice.invoiceNo}</strong>
            </div>
            <div className="ref-meta-item">
              <span className="ref-italic">Invoice Date</span>
              <strong>{fmtDateDMY(invoice.date)}</strong>
            </div>
          </div>

          <div className="ref-title-badge">
            {getInvoiceTitle(invoice.type)}
          </div>
        </div>

        {/* 3. Party Details Box & Terms Box */}
        <div className="ref-party-terms-grid">
          {/* Party Box */}
          <div className="ref-box ref-party-box">
            <div className="ref-box-row">
              <span className="ref-italic-label">To: M/s</span>
              <strong className="ref-party-name-val">{invoice.partyName || 'Walk-in Customer'}</strong>
            </div>
            <div className="ref-box-row">
              <span className="ref-italic-label">Address</span>
              <span>{invoice.partyAddress || '—'}</span>
            </div>
            <div className="ref-box-row">
              <span className="ref-italic-label">Telephone</span>
              <strong>{invoice.contact || '—'}</strong>
            </div>
            <div className="ref-box-row ref-two-col-row">
              <div>
                <span className="ref-italic-label">ST Reg No</span>
                <strong>{invoice.stRegNo || '—'}</strong>
              </div>
              <div>
                <span className="ref-italic-label">N.T.N / C.N.I.C</span>
                <strong>{invoice.partyTaxId || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Terms Box */}
          <div className="ref-box ref-terms-box">
            <div className="ref-box-row">
              <span className="ref-italic-label">Terms of Payment</span>
              <strong>{String(invoice.paymentMethod || 'CASH').toUpperCase()}</strong>
            </div>
            {invoice.referenceId && (
              <div className="ref-box-row">
                <span className="ref-italic-label">Ref ID</span>
                <span>{invoice.referenceId}</span>
              </div>
            )}
            {invoice.createdByName && (
              <div className="ref-box-row">
                <span className="ref-italic-label">Served By</span>
                <span>{invoice.createdByName}</span>
              </div>
            )}
            {invoice.exchangeCase && (
              <div className="ref-box-row">
                <span className="ref-italic-label">Exchange Case</span>
                <span>{invoice.exchangeCase}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Line Items Table */}
        <div className="ref-table-wrap">
          <table className="ref-items-table">
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}><em>S. No.</em></th>
                <th style={{ width: '35%', textAlign: 'left' }}><em>Description</em></th>
                <th style={{ width: '12%', textAlign: 'center' }}><em>H S Code</em></th>
                <th style={{ width: '8%', textAlign: 'right' }}><em>Quantity</em></th>
                <th style={{ width: '10%', textAlign: 'right' }}><em>Rate</em></th>
                <th style={{ width: '10%', textAlign: 'right' }}><em>Amount</em></th>
                <th style={{ width: '10%', textAlign: 'right' }}><em>Discount</em></th>
                <th style={{ width: '10%', textAlign: 'right' }}><em>Net Amount</em></th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const qty = parseFloat(item.quantity || 1);
                  const rate = parseFloat(item.rate || item.unitPrice || 0);
                  const disc = parseFloat(item.discount || 0);
                  const amount = parseFloat(item.amount || (qty * rate));
                  const netAmount = parseFloat(item.lineTotal || (amount - disc));

                  return (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'left' }}>
                        <span className="ref-item-main-title">{item.name || item.description || 'Item'}</span>
                        {item.description && item.description !== item.name && (
                          <div className="ref-item-sub-desc">{item.description}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.hsCode || item.productCode || item.code || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{qty.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{numStr(rate)}</td>
                      <td style={{ textAlign: 'right' }}>{numStr(amount)}</td>
                      <td style={{ textAlign: 'right' }}>{numStr(disc)}</td>
                      <td style={{ textAlign: 'right' }}>{numStr(netAmount)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '16px' }}>
                    No line items available
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Table Totals Row */}
          <div className="ref-totals-subbar">
            <span className="ref-totals-subbar-title">Totals Rs.</span>
            <strong className="ref-totals-subbar-val">{numStr(totalExcludingTax)}</strong>
          </div>
        </div>

        {/* 5. Amount in Words & Totals Card */}
        <div className="ref-financials-grid">
          <div className="ref-words-col">
            <div className="ref-words-title"><em>Amount in Words :</em></div>
            <div className="ref-words-body">
              {amountInWordsPKR(totalIncludingTax)}
            </div>
          </div>

          <div className="ref-summary-box">
            <div className="ref-summary-row">
              <span>Gross Amount</span>
              <strong>{numStr(grossAmount)}</strong>
            </div>
            <div className="ref-summary-row">
              <span>Discount</span>
              <strong>{numStr(totalDiscount)}</strong>
            </div>
            <div className="ref-summary-row">
              <span>Total Excluding Sales Tax Rs.</span>
              <strong>{numStr(totalExcludingTax)}</strong>
            </div>
            {taxAmount > 0 ? (
              <div className="ref-summary-row">
                <span>Sales Tax Rs.</span>
                <strong>{numStr(taxAmount)}</strong>
              </div>
            ) : (
              <div className="ref-summary-row">
                <span>Sales Tax Rs.</span>
                <strong>0.00</strong>
              </div>
            )}
            <div className="ref-summary-row ref-summary-grand">
              <span>Total Including Sales Tax Rs.</span>
              <strong>{numStr(totalIncludingTax)}</strong>
            </div>
            {balance > 0.005 && (
              <>
                <div className="ref-summary-row" style={{ borderTop: '1px dashed #cbd5e1', marginTop: 4, paddingTop: 4 }}>
                  <span>Amount Paid Rs.</span>
                  <strong>{numStr(paid)}</strong>
                </div>
                <div className="ref-summary-row" style={{ color: '#dc2626' }}>
                  <span>Balance Due Rs.</span>
                  <strong>{numStr(balance)}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 6. Compliance, FBR Logo, and Dynamic QR Section */}
        <div className="ref-compliance-section">
          {invoice.fbrInvoiceNo ? (
            <div className="ref-fbr-invoice-block">
              <div className="ref-fbr-title">FBR Invoice #</div>
              <div className="ref-fbr-number">{invoice.fbrInvoiceNo}</div>
            </div>
          ) : (
            <div className="ref-fbr-invoice-block">
              <div className="ref-fbr-title">FBR Invoice #</div>
              <div className="ref-fbr-number">{invoice.invoiceNo}</div>
            </div>
          )}

          <div className="ref-badge-qr-row">
            <div className="ref-fbr-logo-wrap">
              <FbrLogo width={175} height={82} />
            </div>

            <div className="ref-qr-wrap">
              <QRCodeSVG
                value={qrData}
                size={82}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* 7. Footer Divider & Power Note */}
        <div className="ref-footer-section">
          <div className="ref-footer-copy">
            Powerd By: {companyBranding.invoice_footer || companyBranding.company_name || 'Retail & Repair Management'}
          </div>
        </div>

      </div>

      <div className="notice no-print" style={{ marginTop: 14 }}>
        Print or “Save as PDF” produces an exact A4 accounting invoice matching the reference layout.
      </div>
    </Modal>
  );
}
