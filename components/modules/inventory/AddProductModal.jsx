import React, { useState, useEffect } from 'react';
import { Store, Phone, MapPin, CreditCard, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import Modal from '../../common/Modal';
import CommonProductFields from '../../common/CommonProductFields';
import QuickAddVendorModal from '../../common/QuickAddVendorModal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';

export default function AddProductModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vendor payment state - open input for the seller to type
  const [paidInput, setPaidInput] = useState('');
  const [isManualPaid, setIsManualPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  const [formData, setFormData] = useState({
    category: 'Laptop',
    brand: '',
    model: '',
    screenSize: '',
    processor: '',
    ram: '',
    romSsd: '',
    hardDrive: '',
    graphicsCard: '',
    accessoryCategory: '',
    description: '',
    others: '',
    condition: 'Used',
    quantity: 1,
    lowStockAlert: 1,
    costPrice: '',
    expectedSalePrice: '',
    remarks: '',
    vendorId: '',
    vendorName: '',
    purchaseInvoiceNo: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const loadInitialData = () => {
    Promise.all([
      api.get('/categories'),
      api.get('/vendors')
    ])
      .then(([cRes, vRes]) => {
        if (cRes.success) setCategories(cRes.data.productCategories || []);
        if (vRes.success) setVendors(vRes.data || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      loadInitialData();

      const handleCategoryUpdate = () => {
        loadInitialData();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('app:categories-updated', handleCategoryUpdate);
      }

      setPaidInput('');
      setIsManualPaid(false);
      setPaymentMethod('Cash');
      setReferenceId('');
      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });

      setFormData({
        category: 'Laptop',
        brand: '',
        model: '',
        screenSize: '',
        processor: '',
        ram: '',
        romSsd: '',
        hardDrive: '',
        graphicsCard: '',
        accessoryCategory: '',
        description: '',
        others: '',
        condition: 'Used',
        quantity: 1,
        lowStockAlert: 1,
        costPrice: '',
        expectedSalePrice: '',
        remarks: '',
        vendorId: '',
        vendorName: '',
        purchaseInvoiceNo: '',
        purchaseDate: new Date().toISOString().split('T')[0]
      });

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('app:categories-updated', handleCategoryUpdate);
        }
      };
    }
  }, [isOpen]);

  // Auto-calculate full paid amount whenever quantity or costPrice changes
  useEffect(() => {
    if (!isManualPaid) {
      const q = parseInt(formData.quantity || 1, 10);
      const c = parseFloat(formData.costPrice || 0);
      const tot = (isNaN(q) ? 1 : q) * (isNaN(c) ? 0 : c);
      setPaidInput(tot > 0 ? String(tot) : '');
    }
  }, [formData.quantity, formData.costPrice, isManualPaid]);

  const handleFieldChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleVendorSelect = (e) => {
    const val = e.target.value;
    if (val === '__add__') {
      setIsAddVendorOpen(true);
      return;
    }
    if (!val) {
      setFormData(prev => ({ ...prev, vendorId: '', vendorName: '' }));
      return;
    }
    const found = vendors.find(v => v.id === val);
    if (found) {
      setFormData(prev => ({
        ...prev,
        vendorId: found.id,
        vendorName: found.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vendorId: '',
        vendorName: val
      }));
    }
  };

  const handleVendorCreated = (newVendor) => {
    setVendors(prev => {
      const exists = prev.some(v => v.id === newVendor.id);
      return exists ? prev : [newVendor, ...prev];
    });
    setFormData(prev => ({
      ...prev,
      vendorId: newVendor.id,
      vendorName: newVendor.name
    }));
  };

  const selectedVendor = vendors.find(v => v.id === formData.vendorId || (formData.vendorName && v.name === formData.vendorName));
  const qty = parseInt(formData.quantity || 1, 10);
  const cost = parseFloat(formData.costPrice || 0);
  const totalCost = (isNaN(qty) ? 1 : qty) * (isNaN(cost) ? 0 : cost);

  // Derive calculated paid amount from seller's direct input
  const numPaid = paidInput === '' ? totalCost : Math.max(0, parseFloat(paidInput) || 0);
  const effectivePaid = Math.min(numPaid, totalCost);
  const remainingBalance = Math.max(0, totalCost - effectivePaid);

  // Dynamic payment status
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

  const executeAddProduct = async () => {
    const sale = parseFloat(formData.expectedSalePrice || (cost * 1.15));

    setSubmitting(true);
    try {
      const payload = {
        category: formData.category || formData.categoryName || 'Laptop',
        categoryName: formData.category || formData.categoryName || 'Laptop',
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        specifications: [
          formData.screenSize && `${formData.screenSize}`,
          formData.processor && `CPU: ${formData.processor}`,
          formData.ram && `RAM: ${formData.ram}`,
          formData.romSsd && `SSD: ${formData.romSsd}`,
          formData.hardDrive && `HDD: ${formData.hardDrive}`,
          formData.graphicsCard && `GPU: ${formData.graphicsCard}`,
          formData.accessoryCategory && `Type: ${formData.accessoryCategory}`,
          formData.description,
          formData.others
        ].filter(Boolean).join(' • '),
        condition: formData.condition,
        quantity: qty,
        lowStockAlert: parseInt(formData.lowStockAlert || 1, 10),
        costPrice: cost,
        expectedSalePrice: sale,
        remarks: formData.remarks,
        vendorId: formData.vendorId || null,
        vendorName: formData.vendorName || null,
        purchaseInvoiceNo: formData.purchaseInvoiceNo || null,
        purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
        paid: effectivePaid,
        paymentMethod: effectivePaid > 0 ? paymentMethod : 'Cash',
        referenceId: effectivePaid > 0 ? referenceId : null
      };

      const res = await api.post('/products', payload);
      if (res.success) {
        toast(`Product ${res.data.code} saved successfully! ${formData.vendorId || formData.vendorName ? 'Vendor ledger updated.' : ''}`);
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        notifyBalanceUpdated();
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error saving product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.brand.trim() || !formData.model.trim()) {
      toast('Category, Brand and Model are required', 'error');
      return;
    }

    if (isNaN(cost) || cost < 0) {
      toast('Valid cost price is required', 'error');
      return;
    }

    // Check Drawer Balance before payment outflow
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
        // API failed (e.g. 401, network) — treat available as 0 to force confirmation
        available = 0;
        balCheckOk = false;
      }
      // Show warning if insufficient balance OR if we couldn't verify (safety block)
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

    await executeAddProduct();
  };

  return (
    <>
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeAddProduct}
        availableBalance={balanceWarningModal.availableBalance}
        requiredAmount={balanceWarningModal.requiredAmount}
        paymentMethod={balanceWarningModal.paymentMethod}
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Add New Inventory Product"
        subtitle="Manual Stock Entry with Composite Signature Auto-merging & Vendor Ledger"
        wide={true}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="addProductForm"
              className="btn primary"
              disabled={submitting}
            >
              {submitting ? 'Saving Product...' : 'Save to Inventory'}
            </button>
          </>
        }
      >
        <form id="addProductForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <CommonProductFields
              values={formData}
              onChange={handleFieldChange}
              categories={categories}
            />

            {/* Supplier / Vendor Section */}
            <div className="span-12" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                  <Store size={16} /> Supplier / Vendor Details (Optional)
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
                <div className="field span-6">
                  <label>Select Supplier / Vendor</label>
                  <select
                    className="select"
                    value={formData.vendorId || ''}
                    onChange={handleVendorSelect}
                  >
                    <option value="">-- No Vendor / General Opening Stock --</option>
                    <option value="__add__" style={{ fontWeight: 700, color: 'var(--primary)' }}>+ Add New Supplier / Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.contact ? `(${v.contact})` : ''} {v.address ? `• ${v.address}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field span-3">
                  <label>Purchase Bill / Invoice #</label>
                  <input
                    className="input"
                    value={formData.purchaseInvoiceNo || ''}
                    onChange={(e) => handleFieldChange('purchaseInvoiceNo', e.target.value)}
                    placeholder="Auto-generated if blank"
                  />
                </div>

                <div className="field span-3">
                  <label>Inward / Purchase Date</label>
                  <input
                    className="input"
                    type="date"
                    value={formData.purchaseDate || ''}
                    onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
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
              </div>
            </div>

            {/* Vendor Payment & Ledger Section (Visible when Vendor is Selected) */}
            {(formData.vendorId || formData.vendorName) && totalCost > 0 && (
              <div className="span-12" style={{
                marginTop: 10,
                padding: '14px 16px',
                background: 'rgba(59, 130, 246, 0.04)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                    <CreditCard size={16} /> Vendor Payment &amp; Ledger
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Total Purchase Cost: <span style={{ color: 'var(--primary)' }}>PKR {totalCost.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="form-grid">
                  {/* Direct Paid Amount Input (span-6) */}
                  <div className="field span-6">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Amount Paid to Vendor (PKR)</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn small soft"
                          style={{ fontSize: 10, padding: '1px 7px', height: 20 }}
                          onClick={() => {
                            setIsManualPaid(false);
                            setPaidInput(totalCost > 0 ? String(totalCost) : '');
                          }}
                        >
                          Full
                        </button>
                        <button
                          type="button"
                          className="btn small soft"
                          style={{ fontSize: 10, padding: '1px 7px', height: 20 }}
                          onClick={() => {
                            setIsManualPaid(true);
                            setPaidInput('0');
                          }}
                        >
                          0 / Udhar
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

                  {/* Payment Method (span-3) */}
                  <div className="field span-3">
                    <div style={{ minHeight: 22, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Payment Method</label>
                    </div>
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

                  {/* Payment Reference (span-3) */}
                  <div className="field span-3">
                    <div style={{ minHeight: 22, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Ref / Txn ID</label>
                    </div>
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
                    marginTop: 6,
                    padding: '10px 14px',
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border)',
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
        </form>
      </Modal>

      {/* Quick Add Vendor Modal */}
      <QuickAddVendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onSuccess={handleVendorCreated}
      />
    </>
  );
}
