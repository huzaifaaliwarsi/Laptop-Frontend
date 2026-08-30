'use client';

import React, { useState, useEffect } from 'react';
import { Store, Phone, MapPin, CreditCard, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import Modal from '../../common/Modal';
import QuickAddVendorModal from '../../common/QuickAddVendorModal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  product,
  onSuccess
}) {
  const { toast } = useToast();
  const [direction, setDirection] = useState('IN');
  const [quantity, setQuantity] = useState(1);
  const [reasonPreset, setReasonPreset] = useState('Supplier Stock Refill / Purchase');
  const [customReason, setCustomReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Vendor & Payment state
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [paidInput, setPaidInput] = useState('');
  const [isManualPaid, setIsManualPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  const loadVendors = () => {
    api.get('/vendors')
      .then(res => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      loadVendors();
      setDirection('IN');
      setQuantity(1);
      setReasonPreset('Supplier Stock Refill / Purchase');
      setCustomReason('');
      setDate(new Date().toISOString().split('T')[0]);
      setVendorId('');
      setVendorName('');
      setPurchaseInvoiceNo('');
      setCostPrice('');
      setPaidInput('');
      setIsManualPaid(false);
      setPaymentMethod('Cash');
      setReferenceId('');
      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });

      if (product) {
        setVendorId(product.vendorId || product.sourceId || '');
        setVendorName(product.vendorName || product.sourceName || '');
        setCostPrice(product.costPrice !== undefined && product.costPrice !== null ? String(product.costPrice) : '');
        setPurchaseInvoiceNo(product.purchaseInvoiceNo || '');
      }
    }
  }, [isOpen]);

  const currentStock = parseInt(product?.stockQuantity || 0, 10);
  const numQty = parseInt(quantity || 0, 10);
  const unitCost = costPrice !== '' ? parseFloat(costPrice) : parseFloat(product?.costPrice || 0);
  const totalCost = numQty * unitCost;
  const newStock = direction === 'IN' ? currentStock + numQty : currentStock - numQty;

  // Auto-calculate paid amount when totalCost changes unless user manually typed it
  useEffect(() => {
    if (!isManualPaid) {
      setPaidInput(totalCost > 0 ? String(totalCost) : '');
    }
  }, [totalCost, isManualPaid]);

  const handleVendorSelect = (e) => {
    const val = e.target.value;
    if (val === '__add__') {
      setIsAddVendorOpen(true);
      return;
    }
    if (!val) {
      setVendorId('');
      setVendorName('');
      return;
    }
    const found = vendors.find(v => v.id === val);
    if (found) {
      setVendorId(found.id);
      setVendorName(found.name);
    } else {
      setVendorId('');
      setVendorName(val);
    }
  };

  const handleVendorCreated = (newVendor) => {
    setVendors(prev => {
      const exists = prev.some(v => v.id === newVendor.id);
      return exists ? prev : [newVendor, ...prev];
    });
    setVendorId(newVendor.id);
    setVendorName(newVendor.name);
  };

  const selectedVendor = vendors.find(v => v.id === vendorId || (vendorName && v.name === vendorName));

  // Payment calculations
  const numPaid = paidInput === '' ? totalCost : Math.max(0, parseFloat(paidInput) || 0);
  const effectivePaid = Math.min(numPaid, totalCost);
  const remainingBalance = Math.max(0, totalCost - effectivePaid);

  let paymentStatusType = 'unpaid';
  if (totalCost > 0) {
    if (effectivePaid >= totalCost) {
      paymentStatusType = 'full';
    } else if (effectivePaid > 0) {
      paymentStatusType = 'partial';
    } else {
      paymentStatusType = 'unpaid';
    }
  }

  const finalReason = reasonPreset === '__custom__' ? customReason.trim() : reasonPreset;

  const executeStockAdjustment = async () => {
    setSubmitting(true);
    try {
      const payload = {
        direction,
        quantity: numQty,
        reason: finalReason,
        date,
        costPrice: unitCost,
        vendorId: vendorId || null,
        vendorName: vendorName || null,
        purchaseInvoiceNo: purchaseInvoiceNo || null,
        paid: direction === 'IN' && (vendorId || vendorName) ? effectivePaid : undefined,
        paymentMethod: direction === 'IN' && effectivePaid > 0 ? paymentMethod : 'Cash',
        referenceId: direction === 'IN' && effectivePaid > 0 ? referenceId : null
      };

      const res = await api.post(`/products/${product.id}/adjust`, payload);

      if (res.success) {
        toast(`Stock adjusted successfully! New stock: ${res.data.newStock}`);
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error adjusting stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    if (numQty <= 0) {
      toast('Quantity must be greater than zero', 'error');
      return;
    }
    if (direction === 'OUT' && numQty > currentStock) {
      toast(`Cannot deduct more than current stock of ${currentStock}`, 'error');
      return;
    }
    if (!finalReason) {
      toast('Please select or specify a reason', 'error');
      return;
    }

    // Check Drawer Balance if Stock IN (Stock Purchase/Inward)
    if (direction === 'IN' && totalCost > 0) {
      const requiredAmount = paidInput === '0' ? 0 : (effectivePaid > 0 ? effectivePaid : totalCost);
      if (requiredAmount > 0 && ['Cash', 'Online'].includes(paymentMethod)) {
        let available = 0;
        let balCheckOk = false;
        try {
          const balRes = await api.get('/accounts/drawer-balance', { noCache: true });
          if (balRes.success && balRes.data) {
            available = paymentMethod === 'Cash' ? (balRes.data.cash ?? 0) : (balRes.data.online ?? 0);
            balCheckOk = true;
          }
        } catch (err) {
          // API failed — treat available as 0 to force user confirmation
          available = 0;
          balCheckOk = false;
        }
        if (!balCheckOk || requiredAmount > available + 0.005) {
          setBalanceWarningModal({
            isOpen: true,
            availableBalance: available,
            requiredAmount,
            paymentMethod
          });
          return;
        }
      }
    }

    await executeStockAdjustment();
  };

  if (!product) return null;

  return (
    <>
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeStockAdjustment}
        availableBalance={balanceWarningModal.availableBalance}
        requiredAmount={balanceWarningModal.requiredAmount}
        paymentMethod={balanceWarningModal.paymentMethod}
        isSubmitting={submitting}
      />
      <QuickAddVendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onVendorCreated={handleVendorCreated}
      />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Stock Adjustment & Vendor Ledger"
        subtitle={`${product.code} — ${product.brand} ${product.model || product.productName} • Current Stock: ${currentStock}`}
        wide={true}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="stockAdjForm"
              className={`btn ${direction === 'IN' ? 'primary' : 'danger'}`}
              disabled={submitting || (direction === 'OUT' && numQty > currentStock)}
            >
              {submitting ? 'Applying & Syncing Ledger...' : `Apply Adjustment (${direction === 'IN' ? `+${numQty}` : `-${numQty}`})`}
            </button>
          </>
        }
      >
        <form id="stockAdjForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field span-4">
              <label>Adjustment Type *</label>
              <select
                className="select"
                value={direction}
                onChange={(e) => {
                  const dir = e.target.value;
                  setDirection(dir);
                  if (dir === 'IN') {
                    setReasonPreset('Supplier Stock Refill / Purchase');
                  } else {
                    setReasonPreset('Damaged / Defective Stock');
                  }
                }}
              >
                <option value="IN">Stock IN / Add Stock (+)</option>
                <option value="OUT">Stock OUT / Deduct Stock (-)</option>
              </select>
            </div>

            <div className="field span-4">
              <label>Quantity *</label>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="field span-4">
              <label>Adjustment Date *</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Cost Price Field for Valuation */}
            <div className="field span-4">
              <label>Unit Cost Price (PKR)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="field span-8">
              <label>Reason / Audit Note *</label>
              <select
                className="select"
                value={reasonPreset}
                onChange={(e) => setReasonPreset(e.target.value)}
              >
                {direction === 'IN' ? (
                  <>
                    <option value="Supplier Stock Refill / Purchase">Supplier Stock Refill / Purchase</option>
                    <option value="Physical Inventory Audit (Surplus)">Physical Inventory Audit (Surplus)</option>
                    <option value="Customer Repair Return Surplus">Customer Repair Return Surplus</option>
                    <option value="__custom__">Other Custom Reason...</option>
                  </>
                ) : (
                  <>
                    <option value="Damaged / Defective Stock">Damaged / Defective Stock</option>
                    <option value="Physical Inventory Audit (Shortage)">Physical Inventory Audit (Shortage)</option>
                    <option value="Vendor Return / Defective Replacement">Vendor Return / Defective Replacement</option>
                    <option value="Internal Workshop / Repair Use">Internal Workshop / Repair Use</option>
                    <option value="Loss / Theft Write-off">Loss / Theft Write-off</option>
                    <option value="__custom__">Other Custom Reason...</option>
                  </>
                )}
              </select>
            </div>

            {reasonPreset === '__custom__' && (
              <div className="field span-12">
                <label>Specify Custom Reason *</label>
                <input
                  className="input"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter detailed reason for adjustment"
                  required
                />
              </div>
            )}

            {/* Supplier / Vendor Section (For Stock IN or Vendor Returns) */}
            {(direction === 'IN' || reasonPreset.includes('Vendor Return')) && (
              <div className="span-12" style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                    <Store size={16} /> Supplier / Vendor & Ledger Sync
                  </label>
                  <button
                    type="button"
                    className="btn small soft"
                    style={{ fontSize: 12, padding: '3px 10px' }}
                    onClick={() => setIsAddVendorOpen(true)}
                  >
                    + Add New Supplier
                  </button>
                </div>

                <div className="form-grid">
                  <div className="field span-7">
                    <label>Supplier / Vendor</label>
                    <select
                      className="select"
                      value={vendorId || ''}
                      onChange={handleVendorSelect}
                    >
                      <option value="">-- No Vendor / Internal Addition --</option>
                      <option value="__add__" style={{ fontWeight: 700, color: 'var(--primary)' }}>+ Add New Supplier / Vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.contact ? `(${v.contact})` : ''} {v.address ? `• ${v.address}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field span-5">
                    <label>Purchase Bill / Invoice #</label>
                    <input
                      className="input"
                      value={purchaseInvoiceNo}
                      onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                      placeholder="e.g. BILL-9801 / Auto"
                    />
                  </div>

                  {selectedVendor && (
                    <div className="span-12" style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 4, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span><strong>Selected Supplier:</strong> {selectedVendor.name}</span>
                      {selectedVendor.contact && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} /> <strong>Phone:</strong> {selectedVendor.contact}
                        </span>
                      )}
                      {selectedVendor.address && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> <strong>Address:</strong> {selectedVendor.address}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Vendor Payment & Ledger Panel for Stock IN */}
                  {direction === 'IN' && (vendorId || vendorName) && totalCost > 0 && (
                    <div className="span-12" style={{
                      marginTop: 6,
                      padding: 14,
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: 6
                      }}>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy)' }}>
                          <CreditCard size={15} /> Vendor Purchase Payment & Ledger Entry
                        </label>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                          Total Value: <strong>PKR {totalCost.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</strong> ({numQty} units × PKR {unitCost.toLocaleString('en-PK')})
                        </span>
                      </div>

                      <div className="form-grid">
                        {/* Amount Paid Input */}
                        <div className="field span-6">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Amount Paid to Vendor (PKR)</label>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: '2px 8px', fontSize: 10, height: 22 }}
                                onClick={() => {
                                  setIsManualPaid(true);
                                  setPaidInput(String(totalCost));
                                }}
                              >
                                Full Paid
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: '2px 8px', fontSize: 10, height: 22 }}
                                onClick={() => {
                                  setIsManualPaid(true);
                                  setPaidInput('0');
                                }}
                              >
                                Unpaid (Udhar)
                              </button>
                            </div>
                          </div>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            max={totalCost}
                            step="0.01"
                            value={paidInput}
                            onChange={(e) => {
                              setIsManualPaid(true);
                              setPaidInput(e.target.value);
                            }}
                            placeholder="0.00"
                          />
                        </div>

                        {/* Payment Method */}
                        <div className="field span-3">
                          <label style={{ fontSize: 12, fontWeight: 600 }}>Payment Method</label>
                          <select
                            className="select"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={effectivePaid <= 0}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Online">Online / Bank Transfer</option>
                            <option value="EasyPaisa">EasyPaisa / JazzCash</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        {/* Payment Reference */}
                        <div className="field span-3">
                          <label style={{ fontSize: 12, fontWeight: 600 }}>Ref / Txn ID</label>
                          <input
                            className="input"
                            value={referenceId}
                            onChange={(e) => setReferenceId(e.target.value)}
                            placeholder="Optional"
                            disabled={effectivePaid <= 0}
                          />
                        </div>

                        {/* Live Status & Ledger Impact Summary */}
                        <div className="span-12" style={{
                          marginTop: 4,
                          padding: '10px 14px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          fontSize: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>Status:</span>
                            {paymentStatusType === 'full' && (
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#059669',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <CheckCircle2 size={13} /> Full Paid (PKR {effectivePaid.toLocaleString('en-PK', { maximumFractionDigits: 2 })})
                              </span>
                            )}
                            {paymentStatusType === 'partial' && (
                              <span style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#d97706',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <DollarSign size={13} /> Partial Paid (PKR {effectivePaid.toLocaleString('en-PK', { maximumFractionDigits: 2 })})
                              </span>
                            )}
                            {paymentStatusType === 'unpaid' && (
                              <span style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#dc2626',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <Clock size={13} /> Unpaid / Udhar (PKR 0.00)
                              </span>
                            )}
                          </div>

                          <div>
                            <strong>Remaining Udhar (Payable):</strong>{' '}
                            <span style={{
                              color: remainingBalance > 0 ? '#dc2626' : '#059669',
                              fontWeight: 700,
                              fontSize: 13
                            }}>
                              PKR {remainingBalance.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Projected Stock Summary */}
            <div className="span-12 summary-box" style={{ marginTop: 8 }}>
              <div className="summary-row">
                <span>Current Stock</span>
                <strong>{currentStock} units</strong>
              </div>
              <div className="summary-row">
                <span>Adjustment</span>
                <strong style={{ color: direction === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                  {direction === 'IN' ? `+${numQty}` : `-${numQty}`} units
                </strong>
              </div>
              <div className="summary-row total">
                <span>Projected New Stock</span>
                <strong>{Math.max(0, newStock)} units</strong>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
