'use client';

import React from 'react';
import { numStr } from '../../../utils/formatters';
import { amountInWordsPKR } from '../../../utils/numberToWords';

export default function InvoiceTotals({
  invoice = {},
  config = {}
}) {
  const items = invoice.items || [];
  const total = parseFloat(invoice.total || 0);
  const paid = parseFloat(invoice.paid || 0);
  const balance = Math.max(0, parseFloat(invoice.balance || (total - paid)));
  const taxAmount = parseFloat(invoice.taxAmount || 0);

  // Compute item level gross & discount
  let grossAmount = 0;
  let totalDiscount = 0;
  items.forEach(item => {
    const qty = parseFloat(item.quantity || 1);
    const rate = parseFloat(item.rate || item.unitPrice || item.charges || 0);
    const disc = parseFloat(item.discount || 0);
    grossAmount += (qty * rate);
    totalDiscount += disc;
  });

  if (grossAmount === 0 && total > 0) {
    grossAmount = total;
  }

  const totalExcludingTax = grossAmount - totalDiscount;
  const totalIncludingTax = total > 0 ? total : (totalExcludingTax + taxAmount);

  return (
    <div className="std-totals-section">
      {/* Left Box: Amount in Words */}
      <div className="std-words-container">
        <div className="std-words-title">Amount in Words :</div>
        <div className="std-words-text">{amountInWordsPKR(totalIncludingTax)}</div>

        {invoice.remarks && (
          <div className="std-remarks-box">
            <strong>Remarks:</strong> {invoice.remarks}
          </div>
        )}
      </div>

      {/* Right Box: Bordered Financial Summary */}
      <div className="std-summary-box">
        <table className="std-summary-table">
          <tbody>
            <tr>
              <td className="std-sum-lbl">Gross Amount</td>
              <td className="std-sum-val font-mono">{numStr(grossAmount)}</td>
            </tr>
            <tr>
              <td className="std-sum-lbl">Discount</td>
              <td className="std-sum-val font-mono">{numStr(totalDiscount)}</td>
            </tr>
            <tr>
              <td className="std-sum-lbl">Total Excluding Sales Tax Rs.</td>
              <td className="std-sum-val font-mono">{numStr(totalExcludingTax)}</td>
            </tr>
            <tr>
              <td className="std-sum-lbl">Sales Tax Rs.</td>
              <td className="std-sum-val font-mono">{numStr(taxAmount)}</td>
            </tr>
            <tr className="std-sum-highlight-row">
              <td className="std-sum-lbl font-bold">Total Including Sales Tax Rs.</td>
              <td className="std-sum-val font-mono font-bold">{numStr(totalIncludingTax)}</td>
            </tr>
            {paid > 0 && (
              <tr>
                <td className="std-sum-lbl">Amount Paid Rs.</td>
                <td className="std-sum-val font-mono text-success font-bold">{numStr(paid)}</td>
              </tr>
            )}
            {balance > 0 && (
              <tr className="std-sum-balance-row">
                <td className="std-sum-lbl text-danger font-bold">Remaining Balance Rs.</td>
                <td className="std-sum-val font-mono text-danger font-bold">{numStr(balance)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
