'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function RepairPaymentModal({
  isOpen,
  onClose,
  job,
  isDeliveryHandover = false,
  onSuccess
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      const rem = Math.max(0, parseFloat(job.total || 0) - parseFloat(job.paid || 0));
      setAmount(rem > 0 ? rem : '');
      setPaymentMethod('Cash');
      setReference('');
      setNote(isDeliveryHandover ? 'Final payment before delivery handover' : 'Repair installment payment');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, job, isDeliveryHandover]);

  if (!job) return null;

  const remaining = Math.max(0, parseFloat(job.total || 0) - parseFloat(job.paid || 0));
  const payAmount = parseFloat(amount || 0);

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

    setSubmitting(true);
    try {
      if (isDeliveryHandover) {
        const res = await api.post(`/repairs/${job.id}/deliver`, {
          amount: payAmount,
          paymentMethod,
          reference: reference.trim()
        });
        if (res.success) {
          toast('Payment collected & device delivered successfully!');
          onClose();
          if (onSuccess) onSuccess();
        }
      } else {
        const res = await api.post(`/repairs/${job.id}/collect-payment`, {
          amount: payAmount,
          paymentMethod,
          reference: reference.trim(),
          note: note.trim(),
          date
        });
        if (res.success) {
          toast('Payment collected & balance updated!');
          onClose();
          if (onSuccess) onSuccess();
        }
      }
    } catch (err) {
      toast(err.message || 'Error recording repair payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeliveryHandover ? "Pay & Deliver Handover" : "Collect Repair Payment"}
      subtitle={`${job.trackingId || job.tracking_id} — ${job.customerName || job.customer_name}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="repairPayForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Recording...' : isDeliveryHandover ? `Collect ${money(payAmount)} & Deliver` : `Record Payment (${money(payAmount)})`}
          </button>
        </>
      }
    >
      <form id="repairPayForm" onSubmit={handleSubmit}>
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
            <label>Amount to Collect (Remaining: {money(remaining)}) *</label>
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
            <label>Reference / Transaction ID</label>
            <input
              className="input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Slip No. or Online ref"
            />
          </div>

          <div className="field span-6">
            <label>Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field span-12">
            <label>Payment Note</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for this installment"
            />
          </div>

          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>Total Repair Bill</span>
              <strong>{money(job.total)}</strong>
            </div>
            <div className="summary-row">
              <span>Currently Paid</span>
              <strong>{money(job.paid)}</strong>
            </div>
            <div className="summary-row total">
              <span>Outstanding Before</span>
              <strong>{money(remaining)}</strong>
            </div>
            <div className="summary-row" style={{ color: 'var(--success)' }}>
              <span>Balance After This Payment</span>
              <strong>{money(Math.max(0, remaining - payAmount))}</strong>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
