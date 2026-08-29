'use client';

import React from 'react';
import { fmtDateDMY } from '../../../utils/formatters';

export default function InvoiceMeta({
  invoice = {},
  config = {}
}) {
  const invNumber = invoice.invoiceNo || invoice.trackingId || invoice.id || '—';
  const invDate = fmtDateDMY(invoice.date || invoice.createdAt);
  const title = config.title || 'SALES TAX INVOICE';

  return (
    <div className="std-meta-bar">
      <div className="std-meta-left">
        <div className="std-meta-field">
          <span className="std-meta-label">Invoice No.</span>
          <span className="std-meta-val font-bold">{invNumber}</span>
        </div>
        <div className="std-meta-field">
          <span className="std-meta-label">Invoice Date</span>
          <span className="std-meta-val font-bold">{invDate}</span>
        </div>
      </div>

      <div className="std-meta-right">
        <div className="std-title-box">
          {title}
        </div>
      </div>
    </div>
  );
}
