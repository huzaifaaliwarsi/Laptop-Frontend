'use client';

import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import InvoiceMeta from './InvoiceMeta';
import PartyDetails from './PartyDetails';
import InvoiceItemsTable from './InvoiceItemsTable';
import ExchangeItemsView from './ExchangeItemsView';
import PaymentReceiptView from './PaymentReceiptView';
import InvoiceTotals from './InvoiceTotals';
import InvoiceFooter from './InvoiceFooter';
import { getTransactionConfig } from '../../../utils/formatters';

export default function InvoiceLayout({
  invoice = {},
  companyBranding = {}
}) {
  if (!invoice) return null;

  const config = getTransactionConfig(invoice.type || invoice.typeKey, invoice);
  const isExchange = config.category === 'exchange';
  const isPaymentReceipt = config.category === 'payment_receipt';

  return (
    <div className="std-invoice-paper" id="printableInvoice">
      
      {/* 1. Header (Company Name, Address, NTN/STRN/POS Table) */}
      <InvoiceHeader
        companyBranding={companyBranding}
        config={config}
        invoice={invoice}
      />

      {/* 2. Subheader Meta Bar (Invoice No, Date, Document Title Box) */}
      {!isPaymentReceipt && (
        <InvoiceMeta
          invoice={invoice}
          config={config}
        />
      )}

      {/* 3. Side-by-side Boxes (Party Details & Terms of Payment) */}
      {!isPaymentReceipt && (
        <PartyDetails
          invoice={invoice}
          config={config}
        />
      )}

      {/* 4. Main Transaction Items Table / Exchange / Receipt */}
      {isPaymentReceipt ? (
        <PaymentReceiptView
          receipt={invoice}
          companyBranding={companyBranding}
        />
      ) : isExchange ? (
        <ExchangeItemsView invoice={invoice} />
      ) : (
        <InvoiceItemsTable
          invoice={invoice}
          config={config}
        />
      )}

      {/* 5. Financial Totals & Amount in Words */}
      {!isPaymentReceipt && (
        <InvoiceTotals
          invoice={invoice}
          config={config}
        />
      )}

      {/* 6. Footer (FBR Invoice #, QR Code - No Logos, No Vendor Footer) */}
      <InvoiceFooter
        companyBranding={companyBranding}
        invoice={invoice}
        config={config}
      />
    </div>
  );
}
