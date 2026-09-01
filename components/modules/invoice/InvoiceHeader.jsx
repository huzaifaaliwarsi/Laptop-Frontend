'use client';

import React from 'react';

export default function InvoiceHeader({
  companyBranding = {},
  config = {},
  invoice = {}
}) {
  const companyName = companyBranding.company_name || 'RETAIL & REPAIR MANAGEMENT';
  const address = companyBranding.address || 'Karachi, Pakistan';
  const phone = companyBranding.phone || '';
  const email = companyBranding.email || '';
  const ntn = companyBranding.ntn || companyBranding.tax_number || '-';
  const strn = companyBranding.strn || '-';
  const posId = companyBranding.pos_id || companyBranding.fbr_pos_id || '-';

  return (
    <div className="std-inv-header">
      {/* 1. Logo & Top Company Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8 }}>
        {companyBranding.logo_data && (
          <img
            src={companyBranding.logo_data}
            alt={companyName}
            style={{ maxHeight: 52, maxWidth: 140, objectFit: 'contain' }}
          />
        )}
        <h1 className="std-company-title" style={{ margin: 0 }}>{companyName.toUpperCase()}</h1>
      </div>

      {/* 2. Top Info Row: Address on Left, NTN/STRN/POS Table on Right */}
      <div className="std-header-grid">
        <div className="std-header-left">
          {address && <div className="std-header-address">{address}</div>}
          {(phone || email) && (
            <div className="std-header-contact">
              {phone && <span>Tel: {phone}</span>}
              {phone && email && <span> &nbsp;|&nbsp; </span>}
              {email && <span>Email: {email}</span>}
            </div>
          )}
        </div>

        <div className="std-header-right">
          <table className="std-tax-table">
            <tbody>
              <tr>
                <td className="std-tax-label">NTN #</td>
                <td className="std-tax-val">{ntn}</td>
              </tr>
              <tr>
                <td className="std-tax-label">STRN #</td>
                <td className="std-tax-val">{strn}</td>
              </tr>
              <tr>
                <td className="std-tax-label">POS ID #</td>
                <td className="std-tax-val">{posId}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="std-divider"></div>
    </div>
  );
}
