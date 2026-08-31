'use client';

import React from 'react';
import { numStr, fmtDateDMY } from '../../../utils/formatters';
import { amountInWordsPKR } from '../../../utils/numberToWords';

export default function PaymentReceiptView({
  receipt = {},
  companyBranding = {}
}) {
  const isVendor = receipt.partyType === 'Vendor' || receipt.direction === 'Paid' || String(receipt.accountType || '').includes('Vendor');
  const partyName = receipt.partyName || (isVendor ? 'Vendor Partner' : 'Customer');
  const receiptNo = receipt.id || receipt.invoiceNo || 'REC-0001';
  const payDate = fmtDateDMY(receipt.date || receipt.createdAt);
  const amount = parseFloat(receipt.amount || receipt.paid || 0);
  const prevBalance = parseFloat(receipt.previousBalance || receipt.prevBalance || 0);
  const remBalance = parseFloat(receipt.remainingBalance || receipt.balance || 0);
  const payMethod = receipt.paymentMethod || 'CASH';
  const refId = receipt.referenceId || receipt.paymentReference || '—';
  const notes = receipt.notes || receipt.remarks || '';
  const staff = receipt.createdByName || receipt.createdBy || 'Authorized Staff';

  const directionTitle = isVendor ? 'PAYMENT TO VENDOR' : 'PAYMENT RECEIVED FROM CUSTOMER';

  return (
    <div>
      {/* Subheader Meta Bar */}
      <div className="std-meta-bar">
        <div className="std-meta-left">
          <div className="std-meta-field">
            <span className="std-meta-label">Receipt No.</span>
            <span className="std-meta-val font-bold">{receiptNo}</span>
          </div>
          <div className="std-meta-field">
            <span className="std-meta-label">Payment Date</span>
            <span className="std-meta-val font-bold">{payDate}</span>
          </div>
        </div>

        <div className="std-meta-right">
          <div className="std-title-box">
            {directionTitle}
          </div>
        </div>
      </div>

      {/* Side-by-side Boxes */}
      <div className="std-party-terms-grid">
        {/* Left Box */}
        <div className="std-box">
          <div className="std-row">
            <span className="std-lbl">Party:</span>
            <span className="std-val font-bold">{partyName}</span>
          </div>
          {receipt.contact && (
            <div className="std-row">
              <span className="std-lbl">Contact:</span>
              <span className="std-val">{receipt.contact}</span>
            </div>
          )}
          {(receipt.invoiceNo || receipt.invoice_no) && (
            <div className="std-row">
              <span className="std-lbl">Invoice Ref:</span>
              <span className="std-val font-mono">{receipt.invoiceNo || receipt.invoice_no}</span>
            </div>
          )}
          {notes && (
            <div className="std-row" style={{ marginTop: 'auto' }}>
              <span className="std-lbl">Remarks:</span>
              <span className="std-val">{notes}</span>
            </div>
          )}
        </div>

        {/* Right Box */}
        <div className="std-box">
          <div className="std-row">
            <span className="std-lbl">Payment Mode</span>
            <span className="std-val font-bold text-uppercase">{payMethod}</span>
          </div>
          <div className="std-row">
            <span className="std-lbl">Ref / Slip #</span>
            <span className="std-val font-mono">{refId}</span>
          </div>
          <div className="std-row" style={{ marginTop: 'auto' }}>
            <span className="std-lbl">Received By</span>
            <span className="std-val">{staff}</span>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Box */}
      <div className="std-totals-section">
        <div className="std-words-container">
          <div className="std-words-title">Amount in Words :</div>
          <div className="std-words-text">{amountInWordsPKR(amount)}</div>
        </div>

        <div className="std-summary-box">
          <table className="std-summary-table">
            <tbody>
              {prevBalance > 0 && (
                <tr>
                  <td className="std-sum-lbl">Previous Balance Rs.</td>
                  <td className="std-sum-val font-mono">{numStr(prevBalance)}</td>
                </tr>
              )}
              <tr className="std-sum-highlight-row">
                <td className="std-sum-lbl font-bold">Payment Settled Rs.</td>
                <td className="std-sum-val font-mono font-bold text-success">{numStr(amount)}</td>
              </tr>
              <tr className="std-sum-balance-row">
                <td className="std-sum-lbl font-bold">Remaining Balance Rs.</td>
                <td className="std-sum-val font-mono font-bold">{numStr(remBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
