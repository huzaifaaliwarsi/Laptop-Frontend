'use client';

import React from 'react';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { numStr } from '../../utils/formatters';

export default function InsufficientBalanceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  paymentMethod = 'Cash',
  requiredAmount = 0,
  availableBalance = 0,
  isSubmitting = false
}) {
  if (!isOpen) return null;

  const req = parseFloat(requiredAmount || 0);
  const avail = parseFloat(availableBalance || 0);
  const deficit = Math.max(0, req - avail);
  const projectedBalance = avail - req;
  const channel = paymentMethod === 'Online' ? 'Online / Bank Account' : 'Cash Drawer';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insufficient Balance"
      subtitle={`Available ${channel} balance is below the required payment amount`}
      zIndex={1000}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <X size={14} /> Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              padding: '9px 22px',
              borderRadius: 8,
              border: 'none',
              background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(220,38,38,0.35)'
            }}
          >
            <CheckCircle size={14} />
            {isSubmitting ? 'Processing...' : 'Confirm & Proceed'}
          </button>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>

        {/* Alert Banner */}
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          background: '#fef9f0',
          border: '1px solid #fde68a',
          borderLeft: '4px solid #f59e0b',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 20
        }}>
          <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 3 }}>
              Payment exceeds available {channel} balance
            </div>
            <div style={{ color: '#b45309', fontSize: 12, lineHeight: 1.5 }}>
              You have <strong>PKR {numStr(avail)}</strong> available but are attempting to pay <strong>PKR {numStr(req)}</strong>.
              Proceeding will result in a negative balance recorded in your reports.
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 16
        }}>
          {/* Header */}
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            padding: '10px 16px',
            fontSize: 11,
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Transaction Summary
          </div>

          {/* Rows */}
          {[
            { label: 'Payment Channel', value: channel, color: '#111827' },
            { label: 'Amount to be Paid', value: `PKR ${numStr(req)}`, color: '#111827' },
            { label: 'Available Balance', value: `PKR ${numStr(avail)}`, color: avail <= 0 ? '#dc2626' : '#059669' },
            { label: 'Shortfall', value: `PKR ${numStr(deficit)}`, color: '#dc2626', bold: true },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '11px 16px',
              borderBottom: '1px solid #f3f4f6',
              background: '#ffffff'
            }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: row.bold ? 800 : 600, color: row.color, fontFamily: 'monospace' }}>
                {row.value}
              </span>
            </div>
          ))}

          {/* Projected Balance Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '13px 16px',
            background: '#fef2f2',
            borderTop: '1.5px dashed #fca5a5'
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>Balance After Transaction</div>
              <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2 }}>This will be reflected in financial reports</div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#b91c1c', fontFamily: 'monospace' }}>
              PKR {numStr(projectedBalance)}
            </span>
          </div>
        </div>

        {/* Note */}
        <p style={{
          fontSize: 12,
          color: '#6b7280',
          margin: 0,
          lineHeight: 1.6,
          padding: '10px 12px',
          background: '#f9fafb',
          borderRadius: 6,
          border: '1px solid #e5e7eb'
        }}>
          Click <strong style={{ color: '#dc2626' }}>Confirm & Proceed</strong> to allow the transaction with a negative balance,
          or <strong>Cancel</strong> to go back and adjust the payment amount or switch to Credit / Payable.
        </p>

      </div>
    </Modal>
  );
}
