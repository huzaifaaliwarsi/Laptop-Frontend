'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fmtDateDMY } from '../../../utils/formatters';

export default function InvoiceFooter({
  companyBranding = {},
  invoice = {},
  config = {}
}) {
  const fbrNo = invoice.fbrInvoiceNo || null;
  const docNo = invoice.invoiceNo || invoice.trackingId || invoice.id || '';
  const total = parseFloat(invoice.total || 0);

  // Dynamic QR Code payload
  const qrPayload = JSON.stringify({
    inv: docNo,
    dt: fmtDateDMY(invoice.date || invoice.createdAt),
    tot: total,
    party: invoice.partyName || invoice.customerName || 'Customer',
    fbr: fbrNo || undefined
  });

  return (
    <div className="std-footer-root">
      
      {/* Centered FBR or Document Verification Number */}
      <div className="std-fbr-center-block">
        <div className="std-fbr-label">{fbrNo ? 'FBR Invoice #' : 'Document Verification #'}</div>
        <div className="std-fbr-value font-mono">{fbrNo || docNo}</div>
      </div>

      {/* Verification QR Code (Clean & Crisp, NO FBR LOGO, NO SOFTWARE VENDOR FOOTER) */}
      <div className="std-verification-row" style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '4px', marginBottom: '10px' }}>
        <div className="std-qr-container">
          <QRCodeSVG
            value={qrPayload}
            size={84}
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Clean Bottom Rule */}
      <div className="std-bottom-rule"></div>
    </div>
  );
}
