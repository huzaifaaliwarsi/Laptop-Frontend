'use client';

import React, { useState, useEffect } from 'react';
import { Store, Phone, MapPin, CreditCard, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import Modal from '../../common/Modal';
import CommonProductFields from '../../common/CommonProductFields';
import QuickAddVendorModal from '../../common/QuickAddVendorModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function EditProductModal({
  isOpen,
  onClose,
  product,
  onSuccess
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vendor payment state
  const [paidInput, setPaidInput] = useState('');
  const [isManualPaid, setIsManualPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');

  const [formData, setFormData] = useState({
    category: '',
    brand: '',
    model: '',
    others: '',
    condition: 'Used',
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
    if (isOpen && product) {
      loadInitialData();

      const handleCategoryUpdate = () => {
        loadInitialData();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('app:categories-updated', handleCategoryUpdate);
      }

      const q = parseInt(product.currentStock || product.stockIn || product.initialStock || 1, 10);
      const c = parseFloat(product.costPrice || 0);
      const initialTot = q * c;

      setPaidInput(initialTot > 0 ? String(initialTot) : '');
      setIsManualPaid(false);
      setPaymentMethod('Cash');
      setReferenceId('');

      setFormData({
        category: product.category || product.categoryName || '',
        brand: product.brand || '',
        model: product.model || product.productName || '',
        others: product.specifications || '',
        condition: product.condition || 'Used',
        quantity: q,
        lowStockAlert: product.lowStockAlert || 1,
        costPrice: product.costPrice !== undefined && product.costPrice !== null ? String(product.costPrice) : '',
        expectedSalePrice: product.expectedSalePrice !== undefined && product.expectedSalePrice !== null ? String(product.expectedSalePrice) : '',
        remarks: product.remarks || '',
        vendorId: product.vendorId || product.sourceId || '',
        vendorName: product.vendorName || product.sourceName || '',
        purchaseInvoiceNo: product.purchaseInvoiceNo || '',
        purchaseDate: product.dateAdded ? String(product.dateAdded).split('T')[0] : new Date().toISOString().split('T')[0]
      });

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('app:categories-updated', handleCategoryUpdate);
        }
      };
    }
  }, [isOpen, product]);

  const qty = parseInt(formData.quantity !== undefined && formData.quantity !== '' ? formData.quantity : (product?.currentStock || 1), 10);
  const cost = parseFloat(formData.costPrice || 0);
  const totalCost = (isNaN(qty) ? 1 : qty) * (isNaN(cost) ? 0 : cost);

  // Auto-calculate paid amount when quantity or cost price changes unless user manually typed paid amount
  useEffect(() => {
    if (!isManualPaid) {
      setPaidInput(totalCost > 0 ? String(totalCost) : '');
    }
  }, [totalCost, isManualPaid]);

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

  // Derive calculated paid amount
  const numPaid = paidInput === '' ? 0 : Math.max(0, parseFloat(paidInput) || 0);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    if (!formData.category || !formData.brand.trim() || !formData.model.trim()) {
      toast('Category, Brand and Model are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: formData.category || formData.categoryName,
        categoryName: formData.category || formData.categoryName,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        specifications: formData.others,
        condition: formData.condition,
        quantity: qty,
        lowStockAlert: parseInt(formData.lowStockAlert || 1, 10),
        costPrice: cost,
        expectedSalePrice: parseFloat(formData.expectedSalePrice || (cost * 1.15)),
        remarks: formData.remarks,
        vendorId: formData.vendorId || null,
        vendorName: formData.vendorName || null,
        purchaseInvoiceNo: formData.purchaseInvoiceNo || null,
        purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
        paid: effectivePaid,
        paymentMethod: effectivePaid > 0 ? paymentMethod : 'Cash',
        referenceId: effectivePaid > 0 ? referenceId : null
      };

      const res = await api.put(`/products/${product.id}`, payload);
      if (res.success) {
        toast(`Product ${product.code} and vendor ledger updated successfully!`);
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error updating product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Product & Vendor Ledger"
        subtitle={product ? `Item Code: ${product.code} • Stock Units: ${qty}` : ''}
        wide={true}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="editProductForm"
              className="btn primary"
              disabled={submitting}
            >
              {submitting ? 'Updating & Syncing Ledger...' : 'Update Product & Sync Ledger'}
            </button>
          </>
        }
      >
        <form id="editProductForm" onSubmit={handleSubmit}>
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
                  <Store size={16} /> Supplier / Vendor & Ledger Details
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
                    value={formData.vendorId || ''}
                    onChange={handleVendorSelect}
                  >
                    <option value="">-- No Vendor / General Stock --</option>
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
                    value={formData.purchaseInvoiceNo || ''}
                    onChange={(e) => handleFieldChange('purchaseInvoiceNo', e.target.value)}
                    placeholder="e.g. INV-9801 / Ref"
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

                {/* Vendor Payment & Ledger Panel */}
                {(formData.vendorId || formData.vendorName) && totalCost > 0 && (
                  <div className="span-12" style={{
                    marginTop: 8,
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
                        Total Value: <strong>PKR {totalCost.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</strong> ({qty} units × PKR {cost.toLocaleString('en-PK')})
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
