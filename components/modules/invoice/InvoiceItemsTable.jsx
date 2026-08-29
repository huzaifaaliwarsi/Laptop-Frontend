'use client';

import React from 'react';
import { numStr } from '../../../utils/formatters';

export default function InvoiceItemsTable({
  invoice = {},
  config = {}
}) {
  const items = invoice.items || [];
  
  // Calculate running total of net amounts
  let subtotalGross = 0;
  let subtotalNet = 0;

  return (
    <div className="std-table-container">
      <table className="std-items-table">
        <thead>
          <tr>
            <th style={{ width: '5%', textAlign: 'center' }}>S. No.</th>
            <th style={{ width: '34%' }}>Description</th>
            <th style={{ width: '13%' }}>H S Code / Code</th>
            <th style={{ width: '8%', textAlign: 'center' }}>Quantity</th>
            <th style={{ width: '10%', textAlign: 'right' }}>Rate</th>
            <th style={{ width: '10%', textAlign: 'right' }}>Amount</th>
            <th style={{ width: '9%', textAlign: 'right' }}>Discount</th>
            <th style={{ width: '11%', textAlign: 'right' }}>Net Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="8" className="std-table-empty">No items on this document.</td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const qty = parseFloat(item.quantity || 1);
              const rate = parseFloat(item.rate || item.unitPrice || item.charges || 0);
              const grossAmt = qty * rate;
              const disc = parseFloat(item.discount || 0);
              const netAmt = parseFloat(item.lineTotal || (grossAmt - disc));

              subtotalGross += grossAmt;
              subtotalNet += netAmt;

              return (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>
                    <div className="std-item-name">{item.name || 'Product / Item'}</div>
                    {item.description && item.description !== item.name && (
                      <div className="std-item-desc">{item.description}</div>
                    )}
                  </td>
                  <td className="font-mono text-muted">{item.hsCode || item.productCode || item.code || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{qty.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">{numStr(rate)}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">{numStr(grossAmt)}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">{numStr(disc)}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono font-bold">{numStr(netAmt)}</td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr className="std-table-totals-row">
            <td colSpan="7" style={{ textAlign: 'right', fontWeight: 'bold' }}>Totals Rs.</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="font-mono">
              {numStr(subtotalNet || invoice.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
