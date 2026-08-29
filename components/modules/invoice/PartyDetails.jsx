'use client';

import React from 'react';

export default function PartyDetails({
  invoice = {},
  config = {}
}) {
  const partyName = invoice.partyName || invoice.customerName || invoice.vendorName || 'Walk-in Customer';
  const address = invoice.partyAddress || invoice.address || '—';
  const contact = invoice.contact || invoice.phone || '—';
  const stRegNo = invoice.stRegNo || '—';
  const taxId = invoice.partyTaxId || invoice.ntnCnic || invoice.ntn || invoice.ntnTaxId || '—';
  
  const paymentMethod = invoice.paymentMethod || 'CASH';
  const staff = invoice.createdByName || invoice.createdBy || 'Authorized Staff';
  const paymentStatus = invoice.isVoided ? 'VOIDED / RETURNED' : (invoice.paymentStatus || 'Paid');
  const refId = invoice.referenceId || invoice.paymentReference || '';

  return (
    <div className="std-party-terms-grid">
      {/* Left Box: Party Details */}
      <div className="std-box std-party-box">
        <div className="std-row">
          <span className="std-lbl">To: M/s</span>
          <span className="std-val font-bold">{partyName}</span>
        </div>

        <div className="std-row">
          <span className="std-lbl">Address</span>
          <span className="std-val">{address}</span>
        </div>

        <div className="std-row" style={{ marginTop: 'auto' }}>
          <span className="std-lbl">Telephone</span>
          <span className="std-val font-bold">{contact}</span>
        </div>

        <div className="std-row std-split-row">
          <div className="std-sub-field">
            <span className="std-lbl">ST Reg No</span>
            <span className="std-val font-mono font-bold">{stRegNo}</span>
          </div>
          <div className="std-sub-field">
            <span className="std-lbl">N.T.N / C.N.I.C</span>
            <span className="std-val font-mono font-bold">{taxId}</span>
          </div>
        </div>

        {/* Repair Device Info if applicable */}
        {invoice.repairDetails && (
          <div className="std-repair-info-box">
            <div className="std-row">
              <span className="std-lbl">Device:</span>
              <span className="std-val font-bold">{invoice.repairDetails.brand} {invoice.repairDetails.model}</span>
            </div>
            {invoice.repairDetails.problem && (
              <div className="std-row">
                <span className="std-lbl">Problem:</span>
                <span className="std-val text-danger">{invoice.repairDetails.problem}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Box: Terms of Payment & Specifications */}
      <div className="std-box std-terms-box">
        <div className="std-row">
          <span className="std-lbl">Terms of Payment</span>
          <span className="std-val font-bold text-uppercase">{paymentMethod}</span>
        </div>

        <div className="std-row">
          <span className="std-lbl">Payment Status</span>
          <span className="std-val font-bold">{paymentStatus.toUpperCase()}</span>
        </div>

        {refId && (
          <div className="std-row">
            <span className="std-lbl">Reference / Slip ID</span>
            <span className="std-val font-mono">{refId}</span>
          </div>
        )}

        <div className="std-row" style={{ marginTop: 'auto' }}>
          <span className="std-lbl">Sales Person / Tech</span>
          <span className="std-val">{staff}</span>
        </div>
      </div>
    </div>
  );
}
