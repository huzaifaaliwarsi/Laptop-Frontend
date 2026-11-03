'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Wallet, AlertCircle, CheckCircle, RefreshCw, Layers, Printer } from 'lucide-react';
import Modal from '../../common/Modal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function VendorGroupPaymentModal({
  isOpen,
  onClose,
  vendor = null,
  onSuccess
}) {
  const { toast } = useToast();

  const [vendorsList, setVendorsList] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorDetails, setVendorDetails] = useState(null);
  const [openBills, setOpenBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Allocations mapping: { [accountId]: number }
  const [allocations, setAllocations] = useState({});

  // Success Receipt State
  const [successReceiptData, setSuccessReceiptData] = useState(null);

  // Drawer Balance Check
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  // Load vendors list if no vendor is pre-passed
  useEffect(() => {
    if (isOpen) {
      if (vendor && vendor.id) {
        setSelectedVendorId(vendor.id);
        setVendorDetails(vendor);
      } else {
        setSelectedVendorId('');
        setVendorDetails(null);
        api.get('/vendors')
          .then(res => {
            if (res.success) {
              const all = res.data || [];
              setVendorsList(all.filter(v => (v.openPayable || v.payable || 0) > 0));
            }
          })
          .catch(console.error);
      }

      setPaymentAmount('');
      setPaymentMethod('Cash');
      setReferenceId('');
      setNotes('Vendor group settlement');
      setDate(new Date().toISOString().split('T')[0]);
      setAllocations({});
      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });
      setSuccessReceiptData(null);
    }
  }, [isOpen, vendor]);

  // FIFO auto-allocation helper
  const applyFifoAllocation = useCallback((targetAmount, bills) => {
    const totalToAllocate = Math.max(0, parseFloat(targetAmount || 0));
    let remaining = totalToAllocate;
    const newAlloc = {};

    bills.forEach(bill => {
      const billRemaining = parseFloat(bill.remaining || 0);
      if (remaining > 0.005) {
        const take = Math.min(billRemaining, remaining);
        newAlloc[bill.accountId] = parseFloat(take.toFixed(2));
        remaining -= take;
      } else {
        newAlloc[bill.accountId] = 0;
      }
    });

    setAllocations(newAlloc);
  }, []);

  // Fetch open bills whenever selected vendor changes
  useEffect(() => {
    if (isOpen && selectedVendorId) {
      setLoadingBills(true);
      api.get(`/accounts/vendor/${selectedVendorId}/open-bills`)
        .then(res => {
          if (res.success && res.data) {
            const bills = res.data.bills || [];
            setOpenBills(bills);
            setVendorDetails(res.data.vendor);
            const total = res.data.totalPayable || 0;
            // Default payment amount to full outstanding
            setPaymentAmount(total > 0 ? String(total) : '');
            applyFifoAllocation(total, bills);
          } else {
            setOpenBills([]);
          }
        })
        .catch(err => {
          console.error(err);
          toast(err.message || 'Error loading vendor bills', 'error');
          setOpenBills([]);
        })
        .finally(() => setLoadingBills(false));
    } else {
      setOpenBills([]);
    }
  }, [isOpen, selectedVendorId, toast, applyFifoAllocation]);

  // When paymentAmount changes via top input, automatically re-run FIFO
  const handleAmountChange = (val) => {
    setPaymentAmount(val);
    applyFifoAllocation(val, openBills);
  };

  // When user manually edits an individual bill's allocation
  const handleBillAllocationChange = (accountId, val) => {
    const bill = openBills.find(b => b.accountId === accountId);
    if (!bill) return;

    const maxAllowed = parseFloat(bill.remaining || 0);
    let parsed = parseFloat(val || 0);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    if (parsed > maxAllowed) parsed = maxAllowed;

    const updated = {
      ...allocations,
      [accountId]: parseFloat(parsed.toFixed(2))
    };
    setAllocations(updated);

    // Sync total payment amount to sum of manual allocations
    const newTotal = Object.values(updated).reduce((s, a) => s + (parseFloat(a) || 0), 0);
    setPaymentAmount(newTotal > 0 ? String(parseFloat(newTotal.toFixed(2))) : '');
  };

  const totalPayable = openBills.reduce((s, b) => s + (parseFloat(b.remaining) || 0), 0);
  const payAmount = parseFloat(paymentAmount || 0);
  const allocatedSum = Object.values(allocations).reduce((s, a) => s + (parseFloat(a) || 0), 0);
  const unallocatedAmount = Math.max(0, payAmount - allocatedSum);

  const executeGroupPayment = async () => {
    setSubmitting(true);
    try {
      // Build allocation payload
      const allocationPayload = Object.entries(allocations)
        .map(([accId, amt]) => {
          const b = openBills.find(x => x.accountId === accId);
          return {
            accountId: accId,
            invoiceId: b?.invoiceId || null,
            amount: parseFloat(amt || 0)
          };
        })
        .filter(item => item.amount > 0.005);

      const res = await api.post('/accounts/vendor-group-payment', {
        vendorId: selectedVendorId,
        amount: payAmount,
        paymentMethod,
        referenceId: referenceId.trim(),
        notes: notes.trim(),
        date,
        allocations: allocationPayload
      });

      if (res.success) {
        toast(res.message || 'Vendor group payment recorded successfully!');
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        notifyBalanceUpdated();
        if (onSuccess) onSuccess();
        setSuccessReceiptData({
          ...res.data,
          paymentMethod,
          referenceId,
          notes,
          date,
          vendorContact: vendorDetails?.contact || ''
        });
      }
    } catch (err) {
      toast(err.message || 'Error recording vendor group payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVendorId) {
      toast('Please select a vendor', 'error');
      return;
    }

    if (payAmount <= 0) {
      toast('Payment amount must be greater than zero', 'error');
      return;
    }

    if (payAmount > totalPayable + 0.005) {
      toast(`Payment amount cannot exceed total payable of PKR ${totalPayable.toFixed(2)}`, 'error');
      return;
    }

    // Check cash/online drawer balance before outflow
    if (['Cash', 'Online'].includes(paymentMethod)) {
      let available = 0;
      let balCheckOk = false;
      try {
        const balRes = await api.get('/accounts/drawer-balance', { noCache: true });
        if (balRes.success && balRes.data) {
          available = paymentMethod === 'Cash' ? (balRes.data.cash ?? 0) : (balRes.data.online ?? 0);
          balCheckOk = true;
        }
      } catch (err) {
        console.warn('Drawer balance check skipped:', err);
      }

      if (balCheckOk && payAmount > available) {
        setBalanceWarningModal({
          isOpen: true,
          availableBalance: available,
          requiredAmount: payAmount,
          paymentMethod
        });
        return;
      }
    }

    await executeGroupPayment();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setSuccessReceiptData(null);
          onClose();
        }}
        title={successReceiptData ? "Vendor Settlement Voucher" : "Vendor Group / Bulk Payment"}
        subtitle={
          successReceiptData
            ? `Settlement receipt for ${successReceiptData.vendorName} • Recorded on ${fmtDate(successReceiptData.date)}`
            : "Pay multiple purchase bills or clear vendor balance in one transaction"
        }
        wide={true}
        footer={
          successReceiptData ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={15} /> Print Settlement Voucher
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setSuccessReceiptData(null);
                  onClose();
                }}
              >
                Done / Close
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                form="vendorGroupPaymentForm"
                className="btn primary"
                disabled={submitting || payAmount <= 0 || openBills.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <CreditCard size={15} />
                {submitting ? 'Recording Settlement...' : `Pay ${money(payAmount)} to Vendor`}
              </button>
            </div>
          )
        }
      >
        {successReceiptData ? (
          <div style={{ padding: '8px 4px' }}>
            {/* Success Banner */}
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <CheckCircle size={22} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                  Settlement Recorded Successfully!
                </div>
                <div style={{ fontSize: 11.5, color: '#047857', marginTop: 1 }}>
                  PKR {parseFloat(successReceiptData.totalPaid || 0).toLocaleString()} allocated across {successReceiptData.settledBillsCount} purchase bill(s).
                </div>
              </div>
            </div>

            {/* Voucher Meta Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                padding: '14px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                marginBottom: 16
              }}
            >
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block' }}>Vendor</span>
                <strong style={{ fontSize: 13, color: '#0f2b55' }}>{successReceiptData.vendorName}</strong>
                {successReceiptData.vendorContact && (
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{successReceiptData.vendorContact}</span>
                )}
              </div>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block' }}>Payment Method</span>
                <strong style={{ fontSize: 13, color: '#0f2b55' }}>
                  {successReceiptData.paymentMethod === 'Cash' ? 'Cash (Cash Drawer)' : 'Online / Bank Transfer'}
                </strong>
                {successReceiptData.referenceId && (
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Ref: {successReceiptData.referenceId}</span>
                )}
              </div>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block' }}>Total Paid Now</span>
                <strong style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>
                  {money(successReceiptData.totalPaid)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block' }}>Remaining Vendor Balance</span>
                <strong style={{ fontSize: 14, fontWeight: 700, color: successReceiptData.remainingVendorPayable > 0 ? '#dc2626' : '#15803d' }}>
                  {money(successReceiptData.remainingVendorPayable)}
                </strong>
              </div>
            </div>

            {/* Settled Bills Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', fontWeight: 700, fontSize: 11.5, color: '#334155' }}>
                Itemized Settled Bills
              </div>
              <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '6px 12px' }}>Payment ID</th>
                    <th style={{ padding: '6px 12px' }}>Invoice / Bill No</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right' }}>New Balance</th>
                    <th style={{ padding: '6px 12px', textAlign: 'center' }}>Bill Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(successReceiptData.payments || []).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: '#64748b' }}>{p.paymentId}</td>
                      <td style={{ padding: '7px 12px', fontWeight: 700, color: '#0f172a' }}>{p.invoiceNo || p.accountId}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{money(p.amount)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#334155' }}>{money(p.newRemaining)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: p.status === 'Settled' ? '#dcfce7' : '#fef3c7',
                            color: p.status === 'Settled' ? '#15803d' : '#b45309'
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {successReceiptData.notes && (
              <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '0 4px' }}>
                Note: {successReceiptData.notes}
              </div>
            )}
          </div>
        ) : (
        <form id="vendorGroupPaymentForm" onSubmit={handleSubmit}>
          {/* Vendor Selector & Summary Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 16
            }}
          >
            <div style={{ minWidth: 260, flex: '1 1 260px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                Target Vendor *
              </label>
              {vendor && vendor.id ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy, #0f2b55)' }}>
                  {vendor.name} {vendor.contact && <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>({vendor.contact})</span>}
                </div>
              ) : (
                <select
                  className="select"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  style={{ width: '100%', height: 36, fontSize: 12 }}
                >
                  <option value="">Select Vendor with Open Payable...</option>
                  {vendorsList.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} — Outstanding: {money(v.openPayable || v.payable)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ textAlign: 'right', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Open Bills Count
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                  {openBills.length} Bill(s)
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Outstanding
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--danger, #c93e4f)' }}>
                  {money(totalPayable)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Input Grid */}
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="field span-4">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Payment Amount (PKR) *</span>
                {totalPayable > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAmountChange(String(totalPayable))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--blue-600, #2563eb)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Pay Full ({money(totalPayable)})
                  </button>
                )}
              </label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                max={totalPayable > 0 ? totalPayable : undefined}
                value={paymentAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter amount to pay vendor..."
                required
                style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}
              />
            </div>

            <div className="field span-4">
              <label>Payment Method *</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash (Cash Drawer)</option>
                <option value="Online">Online / Bank Transfer</option>
              </select>
            </div>

            <div className="field span-4">
              <label>Payment Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="field span-6">
              <label>Reference / Slip No. (Optional)</label>
              <input
                className="input"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="Bank TRX ID, Cheque No. or Cash Receipt"
              />
            </div>

            <div className="field span-6">
              <label>Notes / Memo</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Lump-sum payment against purchase bills"
              />
            </div>
          </div>

          {/* Allocation Breakdown Table */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} style={{ color: 'var(--blue-600, #2563eb)' }} />
                <strong style={{ fontSize: 12, color: 'var(--navy, #0f2b55)' }}>
                  Bills Breakdown &amp; Settlement Allocation
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  (Oldest bills cleared first via FIFO)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => applyFifoAllocation(paymentAmount, openBills)}
                  className="btn small"
                  style={{
                    padding: '3px 8px',
                    fontSize: 10.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title="Recalculate FIFO distribution"
                >
                  <RefreshCw size={11} /> Auto-Allocate (FIFO)
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {loadingBills ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  Loading open purchase bills...
                </div>
              ) : openBills.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  {selectedVendorId ? 'No open unpaid purchase bills found for this vendor.' : 'Please select a vendor to view unpaid bills.'}
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 12px' }}>Bill / Invoice No</th>
                      <th style={{ padding: '6px 12px' }}>Date</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right' }}>Bill Total</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right' }}>Current Balance</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right', width: 140 }}>Paying Now (PKR)</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right' }}>Remaining After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openBills.map((bill) => {
                      const currentDue = parseFloat(bill.remaining || 0);
                      const allocVal = allocations[bill.accountId] !== undefined ? allocations[bill.accountId] : 0;
                      const remainingAfter = Math.max(0, currentDue - allocVal);
                      const isSettled = allocVal > 0 && remainingAfter <= 0.005;

                      return (
                        <tr
                          key={bill.accountId}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isSettled ? '#f0fdf4' : allocVal > 0 ? '#f8fafc' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {bill.invoiceNo || bill.accountId}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>
                            {fmtDate(bill.date)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                            {money(bill.invoiceTotal || bill.originalAmount)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--danger, #c93e4f)' }}>
                            {money(currentDue)}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              max={currentDue}
                              step="0.01"
                              value={allocVal === 0 ? '' : allocVal}
                              onChange={(e) => handleBillAllocationChange(bill.accountId, e.target.value)}
                              placeholder="0.00"
                              style={{
                                width: 120,
                                height: 30,
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: 11.5,
                                borderColor: allocVal > 0 ? 'var(--blue-600, #2563eb)' : '#cbd5e1',
                                backgroundColor: allocVal > 0 ? '#ffffff' : '#f8fafc'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {isSettled ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d'
                                }}
                              >
                                ✓ Settled
                              </span>
                            ) : (
                              <span style={{ fontWeight: 600, color: remainingAfter > 0 ? '#475569' : '#15803d' }}>
                                {money(remainingAfter)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Allocation Footer Summary */}
            {openBills.length > 0 && (
              <div
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11.5
                }}
              >
                <div style={{ color: '#64748b' }}>
                  Total Allocated Across Bills: <strong style={{ color: '#0f172a' }}>{money(allocatedSum)}</strong>
                </div>
                <div style={{ fontWeight: 700, color: payAmount > 0 ? 'var(--blue-600, #2563eb)' : '#64748b' }}>
                  Total Payment Outflow: {money(payAmount)}
                </div>
              </div>
            )}
          </div>
        </form>
        )}
      </Modal>

      {/* Insufficient Cash Drawer Balance Warning Confirmation */}
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeGroupPayment}
        paymentMethod={balanceWarningModal.paymentMethod}
        availableBalance={balanceWarningModal.availableBalance}
        requiredAmount={balanceWarningModal.requiredAmount}
      />
    </>
  );
}

