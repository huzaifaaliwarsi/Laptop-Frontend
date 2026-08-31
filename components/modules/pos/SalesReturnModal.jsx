'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertCircle, CheckCircle2, DollarSign, Package, User, Calendar, CreditCard } from 'lucide-react';
import Modal from '../../common/Modal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function SalesReturnModal({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('Defective product / Hardware fault');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [refundAmount, setRefundAmount] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  useEffect(() => {
    if (isOpen && invoice) {
      const isBuyback = invoice.type === 'Customer Purchase';
      const isExchange = invoice.type === 'Exchange Invoice' || invoice.type === 'Product Exchange';
      
      setReason(isBuyback ? 'Buyback cancellation / Returned to customer' : isExchange ? 'Exchange cancelled / Reverted' : 'Defective product / Hardware fault');
      setCustomReason('');
      setRefundMethod(invoice.paymentMethod === 'Online' ? 'Online' : 'Cash');
      setRefundAmount(String(invoice.paid || invoice.total || 0));
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, invoice]);

  if (!invoice) return null;

  const isBuyback = invoice.type === 'Customer Purchase';
  const isExchange = invoice.type === 'Exchange Invoice' || invoice.type === 'Product Exchange';

  const items = invoice.items || [];
  const totalPaid = parseFloat(invoice.paid || 0);
  const invoiceTotal = parseFloat(invoice.total || 0);

  const executeReturn = async () => {
    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    const numRefund = parseFloat(refundAmount || 0);

    setSubmitting(true);
    try {
      const res = await api.post(`/invoices/${invoice.id}/void`, {
        reason: `${finalReason}${notes.trim() ? ` — ${notes.trim()}` : ''}`,
        refundAmount: numRefund,
        refundMethod: refundMethod,
        referenceId: referenceId.trim() || null,
        date: date
      });

      if (res.success) {
        if (isBuyback) {
          toast('Customer buyback reverted & inventory updated successfully!');
        } else if (isExchange) {
          toast('Product exchange reverted & inventory updated successfully!');
        } else {
          toast('Customer sales return processed & stock restored successfully!');
        }
        notifyBalanceUpdated();
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Error processing return', 'error');
    } finally {
      setSubmitting(false);
      setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) {
      toast('Please provide a reason for return / void', 'error');
      return;
    }

    const numRefund = parseFloat(refundAmount || 0);
    if (isNaN(numRefund) || numRefund < 0) {
      toast('Amount cannot be negative', 'error');
      return;
    }

    if (refundMethod === 'Online' && numRefund > 0 && !referenceId.trim()) {
      toast('Online payment reference ID is required for online settlement', 'error');
      return;
    }

    // Check Drawer Balance before cash/online refund outflow
    if (numRefund > 0 && ['Cash', 'Online'].includes(refundMethod)) {
      let available = 0;
      let balCheckOk = false;
      try {
        const balRes = await api.get('/accounts/drawer-balance', { noCache: true });
        if (balRes.success && balRes.data) {
          available = refundMethod === 'Cash' ? (balRes.data.cash ?? 0) : (balRes.data.online ?? 0);
          balCheckOk = true;
        }
      } catch (err) {
        available = 0;
        balCheckOk = false;
      }
      if (!balCheckOk || numRefund > available + 0.005) {
        setBalanceWarningModal({
          isOpen: true,
          availableBalance: available,
          requiredAmount: numRefund,
          paymentMethod: refundMethod
        });
        return;
      }
    }

    await executeReturn();
  };

  const modalTitle = isBuyback
    ? 'Customer Buyback Reversal & Void'
    : isExchange
    ? 'Product Exchange Reversal & Void'
    : 'Customer Sales Return & Void Refund';

  const invNumber = invoice.invoice_no || invoice.invoiceNo || invoice.id || '—';
  const partyName = invoice.party_name || invoice.partyName || 'Customer';
  const modalSubtitle = `Process return/void for ${invNumber} — ${partyName}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      wide={true}
    >
      <form onSubmit={handleSubmit} className="sales-return-form">
        {/* Invoice Summary Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 16
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Invoice Number</span>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{invNumber}</strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Party / Customer</span>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{partyName}</strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Invoice Type</span>
              <strong style={{ fontSize: 13, color: '#2563eb' }}>{invoice.type}</strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Total Amount Paid</span>
              <strong style={{ fontSize: 13, color: '#059669' }}>{money(totalPaid)}</strong>
            </div>
          </div>

          {/* Items being returned */}
          <div style={{ marginTop: 12, borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              {isBuyback
                ? 'Product to be Removed from Shop Inventory (returned to customer):'
                : isExchange
                ? 'Exchange Products to be Reverted in Inventory:'
                : 'Products to be Restocked in Inventory:'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                  <span>• {item.quantity}x <strong>{item.name || item.description || 'Product'}</strong> ({item.productCode || item.code || 'Item'})</span>
                  <span>{money(item.lineTotal || (item.quantity * item.rate))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Reason */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Return Reason <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              <option value="Defective product / Hardware fault">Defective product / Hardware fault</option>
              <option value="Customer changed mind / Dissatisfied">Customer changed mind / Dissatisfied</option>
              <option value="Wrong model or specifications sold">Wrong model or specifications sold</option>
              <option value="Warranty claim return">Warranty claim return</option>
              <option value="Exchange return">Exchange return</option>
              <option value="Other">Other (Specify custom reason)</option>
            </select>
          </div>

          {reason === 'Other' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Specify Custom Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Enter return reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
          )}

          {/* Refund Method */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Refund / Settlement Method <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="input"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              <option value="Cash">Cash Refund (Store Drawer)</option>
              <option value="Online">Online Transfer / Bank Refund</option>
              <option value="Customer Credit">Customer Credit / Balance Adjustment</option>
            </select>
          </div>

          {/* Refund Amount */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Refund Amount (PKR) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={totalPaid}
              className="input"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              style={{ width: '100%' }}
              required
            />
            <span style={{ fontSize: 10, color: '#64748b', marginTop: 2, display: 'block' }}>
              Max refundable paid amount: {money(totalPaid)}
            </span>
          </div>

          {/* Reference ID if Online */}
          {refundMethod === 'Online' && (
            <div className="form-group">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Bank / Online Reference ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Transaction or Reference ID..."
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
          )}

          {/* Date */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Return Date
            </label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>

          {/* Additional Notes */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Additional Remarks (Optional)
            </label>
            <textarea
              className="input"
              rows="2"
              placeholder="Any condition notes or customer remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Stock Notice */}
        <div style={{
          display: 'flex',
          gap: 10,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 6,
          padding: '10px 12px',
          marginBottom: 16,
          fontSize: 11.5,
          color: '#1e40af'
        }}>
          <Package size={18} style={{ flexShrink: 0, marginTop: 2, color: '#2563eb' }} />
          <div>
            <strong>Automated Stock Restoration:</strong> Processing this return will automatically restore the product quantities back to the active inventory and log the refund in the financial ledger.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn danger"
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} />
            {submitting ? 'Processing Return...' : 'Confirm Return & Refund'}
          </button>
        </div>
      </form>

      {/* Insufficient Cash / Balance Warning Modal */}
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeReturn}
        paymentMethod={balanceWarningModal.paymentMethod}
        requiredAmount={balanceWarningModal.requiredAmount}
        availableBalance={balanceWarningModal.availableBalance}
        isSubmitting={submitting}
      />
    </Modal>
  );
}
