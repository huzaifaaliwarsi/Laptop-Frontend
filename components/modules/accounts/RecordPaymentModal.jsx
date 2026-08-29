'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  account,
  onSuccess
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  useEffect(() => {
    if (isOpen && account) {
      setAmount(account.remaining || '');
      setPaymentMethod('Cash');
      setReferenceId('');
      setNotes('Installment settlement');
      setDate(new Date().toISOString().split('T')[0]);
      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });
    }
  }, [isOpen, account]);

  if (!account) return null;

  const remaining = parseFloat(account.remaining || 0);
  const payAmount = parseFloat(amount || 0);
  const isReceivable = account.type.includes('Receivable');

  const executePayment = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/accounts/${account.id}/payment`, {
        amount: payAmount,
        paymentMethod,
        referenceId: referenceId.trim(),
        notes: notes.trim(),
        date
      });

      if (res.success) {
        toast('Payment installment recorded & balance updated!');
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error recording payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (payAmount > remaining + 0.005) {
      toast(`Payment cannot exceed outstanding balance of PKR ${remaining.toFixed(2)}`, 'error');
      return;
    }

    // If making payment OUT to vendor, check drawer balance
    if (!isReceivable && ['Cash', 'Online'].includes(paymentMethod)) {
      try {
        const balRes = await api.get('/accounts/drawer-balance');
        if (balRes.success && balRes.data) {
          const available = paymentMethod === 'Cash' ? balRes.data.cash : balRes.data.online;
          if (payAmount > available + 0.005) {
            setBalanceWarningModal({
              isOpen: true,
              availableBalance: available,
              requiredAmount: payAmount,
              paymentMethod
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Could not verify drawer balance before paying vendor:', err);
      }
    }

    await executePayment();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReceivable ? "Receive Customer Payment" : "Make Vendor Payment"}
      subtitle={`${account.type} — ${account.partyName} (Ref: ${account.invoiceNo || account.id})`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="accPayForm"
            className={`btn ${isReceivable ? 'primary' : 'danger'}`}
            disabled={submitting}
          >
            {submitting ? 'Recording...' : isReceivable ? `Receive ${money(payAmount)}` : `Pay ${money(payAmount)}`}
          </button>
        </>
      }
    >
      <form id="accPayForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-6">
            <label>Payment Method *</label>
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online / Bank Transfer</option>
            </select>
          </div>

          <div className="field span-6">
            <label>Payment Amount (Max: {money(remaining)}) *</label>
            <input
              className="input"
              type="number"
              min="1"
              max={remaining}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="field span-6">
            <label>Reference / Slip ID</label>
            <input
              className="input"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Online ref / Receipt No."
            />
          </div>

          <div className="field span-6">
            <label>Payment Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field span-12">
            <label>Transaction Notes</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note or remarks"
            />
          </div>

          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>Account Type</span>
              <strong>{account.type}</strong>
            </div>
            <div className="summary-row">
              <span>Total Invoice Amount</span>
              <strong>{money(account.amount)}</strong>
            </div>
            <div className="summary-row total">
              <span>Outstanding Due</span>
              <strong>{money(remaining)}</strong>
            </div>
            <div className="summary-row" style={{ color: 'var(--success)' }}>
              <span>Balance After Payment</span>
              <strong>{money(Math.max(0, remaining - payAmount))}</strong>
            </div>
          </div>
        </div>
      </form>

      {/* Insufficient Drawer Balance Alert & Confirmation Modal */}
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executePayment}
        paymentMethod={balanceWarningModal.paymentMethod}
        requiredAmount={balanceWarningModal.requiredAmount}
        availableBalance={balanceWarningModal.availableBalance}
        isSubmitting={submitting}
      />
    </Modal>
  );
}
