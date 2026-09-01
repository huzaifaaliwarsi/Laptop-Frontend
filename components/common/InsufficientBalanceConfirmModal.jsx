'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, Loader2, PlusCircle, ArrowDownCircle, Check, Wallet } from 'lucide-react';
import Modal from './Modal';
import { numStr } from '../../utils/formatters';
import api from '../../services/api';

export default function InsufficientBalanceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  paymentMethod = 'Cash',
  requiredAmount = 0,
  availableBalance = 0,
  isSubmitting = false
}) {
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(parseFloat(availableBalance || 0));
  
  // Quick Top-up states
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState(paymentMethod || 'Cash');
  const [topUpNotes, setTopUpNotes] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync available balance when opened
  useEffect(() => {
    if (isOpen) {
      const avail = parseFloat(availableBalance || 0);
      setLiveAvailable(avail);
      setTopUpMethod(paymentMethod || 'Cash');
      const req = parseFloat(requiredAmount || 0);
      const def = Math.max(0, req - avail);
      setTopUpAmount(def > 0 ? String(Math.ceil(def)) : '1000');
      setShowTopUp(false);
      setDepositSuccessMsg('');
      setErrorMessage('');
    }
  }, [isOpen, availableBalance, requiredAmount, paymentMethod]);

  if (!isOpen) return null;

  const req = parseFloat(requiredAmount || 0);
  const avail = liveAvailable;
  const deficit = Math.max(0, req - avail);
  const projectedBalance = avail - req;
  const isNowSufficient = avail >= req - 0.005;
  const channel = topUpMethod === 'Online' ? 'Online' : 'Cash Drawer';

  const isLoading = isSubmitting || localSubmitting;

  const handleConfirmClick = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setLocalSubmitting(true);
    setErrorMessage('');
    try {
      if (onConfirm) {
        await onConfirm();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing transaction');
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleQuickDeposit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount || 0);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Enter a valid deposit amount');
      return;
    }

    setDepositing(true);
    setErrorMessage('');
    try {
      const res = await api.post('/accounts/drawer-transaction', {
        type: 'Deposit',
        method: topUpMethod,
        amount: amt,
        notes: topUpNotes.trim() || `Quick Top-up (Added PKR ${amt.toLocaleString('en-PK')})`
      });

      if (res.success) {
        const newLiveCash = res.data?.liveCash ?? (topUpMethod === 'Cash' ? avail + amt : avail);
        const newLiveOnline = res.data?.liveOnline ?? (topUpMethod === 'Online' ? avail + amt : avail);
        const updatedBal = topUpMethod === (paymentMethod || 'Cash') 
          ? (topUpMethod === 'Cash' ? newLiveCash : newLiveOnline)
          : avail;

        setLiveAvailable(updatedBal);
        setDepositSuccessMsg(`PKR ${amt.toLocaleString('en-PK')} added!`);
        setShowTopUp(false);

        // Notify entire app & sync settings
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:balance-updated'));
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error executing quick deposit');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? undefined : onClose}
      title={isNowSufficient ? "Balance Verified" : "Insufficient Balance"}
      subtitle={isNowSufficient ? "Funds available to proceed." : "Available balance is below required amount."}
      zIndex={1000}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <div>
            {!isNowSufficient && !showTopUp && (
              <button
                type="button"
                onClick={() => setShowTopUp(true)}
                disabled={isLoading || depositing}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #059669',
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <PlusCircle size={15} color="#059669" />
                <span>+ Add Cash / Online</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || depositing}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#374151',
                fontWeight: 600,
                fontSize: 13,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isLoading || depositing}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                border: 'none',
                background: isLoading 
                  ? '#9ca3af' 
                  : isNowSufficient 
                    ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                    : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isLoading ? 'none' : isNowSufficient ? '0 2px 8px rgba(22,163,74,0.35)' : '0 2px 8px rgba(220,38,38,0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  <span>Processing...</span>
                </>
              ) : isNowSufficient ? (
                <>
                  <Check size={16} />
                  <span>Confirm & Save</span>
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>Proceed with Negative Balance</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>

        {/* Error message */}
        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12
          }}>
            {errorMessage}
          </div>
        )}

        {/* Success Banner if deposit made */}
        {depositSuccessMsg && (
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 14,
            color: '#065f46',
            fontSize: 13,
            fontWeight: 700
          }}>
            <CheckCircle size={18} color="#10b981" />
            <span>{depositSuccessMsg} Drawer updated live!</span>
          </div>
        )}

        {/* Top-up CTA Action Card (Original design preserved) */}
        {!isNowSufficient && !showTopUp && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #93c5fd',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Wallet size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 13 }}>
                  Need to top-up before paying?
                </div>
                <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1 }}>
                  Add PKR {numStr(deficit)} or more to {paymentMethod}.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTopUp(true)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              <PlusCircle size={14} />
              <span>+ Add {paymentMethod}</span>
            </button>
          </div>
        )}

        {/* Short Alert Banner */}
        {!isNowSufficient ? (
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: '#fef9f0',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 14
          }}>
            <AlertTriangle size={17} color="#d97706" style={{ flexShrink: 0 }} />
            <div style={{ color: '#92400e', fontSize: 12, fontWeight: 600 }}>
              Available: <strong>PKR {numStr(avail)}</strong> | Required: <strong>PKR {numStr(req)}</strong> (Deficit: <strong>PKR {numStr(deficit)}</strong>)
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderLeft: '4px solid #16a34a',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 14
          }}>
            <CheckCircle size={17} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ color: '#166534', fontSize: 12, fontWeight: 700 }}>
              PKR {numStr(avail)} Available (Sufficient funds)
            </div>
          </div>
        )}

        {/* Quick Top-Up In-Place Form */}
        {showTopUp && (
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #2563eb',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 14,
            boxShadow: '0 4px 14px rgba(37,99,235,0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#1e3a8a', fontSize: 13 }}>
                <PlusCircle size={15} color="#2563eb" />
                <span>Quick Deposit to {topUpMethod}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUp(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Channel
                </label>
                <select
                  className="input"
                  value={topUpMethod}
                  onChange={e => setTopUpMethod(e.target.value)}
                  style={{ width: '100%', fontSize: 12, height: 36 }}
                >
                  <option value="Cash">Cash in Drawer</option>
                  <option value="Online">Online / Bank</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Amount (PKR)
                </label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ width: '100%', fontSize: 13, fontWeight: 700, height: 36 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                className="input"
                value={topUpNotes}
                onChange={e => setTopUpNotes(e.target.value)}
                placeholder="Optional notes (e.g. Float, Owner Cash Top-up)"
                style={{ width: '100%', fontSize: 11, height: 34 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowTopUp(false)}
                disabled={depositing}
                style={{ fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleQuickDeposit}
                disabled={depositing || !topUpAmount || parseFloat(topUpAmount) <= 0}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {depositing ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    <span>Depositing...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownCircle size={14} />
                    <span>Deposit PKR {topUpAmount ? parseFloat(topUpAmount).toLocaleString('en-PK') : '0'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Breakdown Table (Exact original table design preserved) */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 10
        }}>
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            padding: '7px 14px',
            fontSize: 11,
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Financial Summary
          </div>

          {[
            { label: 'Payment Method', value: paymentMethod, color: '#111827' },
            { label: 'Required Amount', value: `PKR ${numStr(req)}`, color: '#111827' },
            { label: 'Available Balance', value: `PKR ${numStr(avail)}`, color: avail <= 0 ? '#dc2626' : '#059669', bold: true },
            { label: 'Deficit', value: `PKR ${numStr(deficit)}`, color: deficit > 0 ? '#dc2626' : '#059669', bold: true },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 14px',
              borderBottom: '1px solid #f3f4f6',
              background: '#ffffff'
            }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{row.label}</span>
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
            padding: '10px 14px',
            background: projectedBalance < 0 ? '#fef2f2' : '#f0fdf4',
            borderTop: projectedBalance < 0 ? '1.5px dashed #fca5a5' : '1.5px solid #bbf7d0'
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: projectedBalance < 0 ? '#991b1b' : '#166534' }}>
                Balance After Transaction
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: projectedBalance < 0 ? '#b91c1c' : '#15803d', fontFamily: 'monospace' }}>
              PKR {numStr(projectedBalance)}
            </span>
          </div>
        </div>

      </div>
    </Modal>
  );
}
