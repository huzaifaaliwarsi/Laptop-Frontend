'use client';

import React from 'react';
import { AlertTriangle, DollarSign, ArrowDownRight, CheckCircle2, X } from 'lucide-react';
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

  const channelLabel = paymentMethod === 'Online' ? 'Online / Bank Account' : 'Cash in Drawer';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚠️ Insufficient Balance Warning"
      subtitle="Drawer balance is lower than the required purchase payment"
    >
      <div style={{ padding: '6px 0' }}>
        {/* Warning Banner */}
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: 18
        }}>
          <div style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>
              Required Amount Exceeds Available {paymentMethod} Funds
            </div>
            <div style={{ color: '#b45309', fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
              Aapke <strong>{channelLabel}</strong> me sirf <strong>PKR {numStr(avail)}</strong> mojood hain, jabke payment <strong>PKR {numStr(req)}</strong> ki ja rahi hai.
            </div>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 18,
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            backgroundColor: '#e2e8f0'
          }}>
            <div style={{ backgroundColor: '#ffffff', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Payment Method / Channel
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {channelLabel}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Required Payment Outflow
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }} className="font-mono">
                PKR {numStr(req)}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Current Available Balance
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: avail < 0 ? '#dc2626' : '#15803d', marginTop: 4 }} className="font-mono">
                PKR {numStr(avail)}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>
                Shortage / Deficit Amount
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', marginTop: 4 }} className="font-mono">
                PKR {numStr(deficit)}
              </div>
            </div>
          </div>

          {/* Projected Balance Callout */}
          <div style={{
            backgroundColor: '#fef2f2',
            borderTop: '1.5px dashed #fca5a5',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                Balance After This Purchase:
              </span>
              <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2 }}>
                Cash/Account balance negative (minus) ho jaye ga.
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#b91c1c' }} className="font-mono">
              PKR {numStr(projectedBalance)}
            </div>
          </div>
        </div>

        {/* User Decision Note */}
        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Agar aap is vendor purchase ko proceed karna chahte hain to <strong>"Confirm (Allow Minus Balance)"</strong> par click karein. Ya <strong>"Cancel"</strong> karke payment amount ko adjust karein ya Payable/Credit par rakhein.
        </p>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '8px 18px', fontWeight: 600 }}
          >
            Cancel / Wapis Jayein
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{ padding: '8px 20px', fontWeight: 700 }}
          >
            {isSubmitting ? 'Processing...' : 'Confirm & Proceed (Minus Balance)'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
