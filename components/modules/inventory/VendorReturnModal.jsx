'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, RefreshCw, Layers, CheckCircle2, ArrowRightLeft, Search, Package, PlusCircle, AlertTriangle } from 'lucide-react';
import Modal from '../../common/Modal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function VendorReturnModal({
  isOpen,
  onClose,
  product,
  onSuccess
}) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [unitRate, setUnitRate] = useState('');
  const [reason, setReason] = useState('Defective product return');
  const [settlementMethod, setSettlementMethod] = useState('Vendor Payable Adjustment');
  const [initialSettlement, setInitialSettlement] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Replacement / Exchange mode: 'same' (standard claim) | 'different' (exchange for different model)
  const [replacementMode, setReplacementMode] = useState('same');

  // Different product selection mode: 'existing' | 'new'
  const [differentSourceType, setDifferentSourceType] = useState('existing');

  // 1. Different product — select from existing inventory
  const [allProducts, setAllProducts] = useState([]);
  const [diffSearch, setDiffSearch] = useState('');
  const [diffSelectedProduct, setDiffSelectedProduct] = useState(null);
  const [diffQty, setDiffQty] = useState(1);
  const [showDiffDropdown, setShowDiffDropdown] = useState(false);
  const diffRef = useRef(null);

  // 2. Different product — brand new incoming product entry from vendor
  const [newProdData, setNewProdData] = useState({
    category: 'Laptop',
    brand: '',
    model: '',
    quantity: 1,
    costPrice: '',
    expectedSalePrice: '',
    specifications: '',
    condition: 'Used',
    lowStockAlert: 1
  });

  // Price Difference Settlement Method (Cash / Online / Vendor Payable)
  const [diffPaymentMethod, setDiffPaymentMethod] = useState('Cash');

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (diffRef.current && !diffRef.current.contains(e.target)) {
        setShowDiffDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (isOpen && product) {
      const origVendorName = product.vendorName || product.sourceName || product.source_name || product.vendor_name || '';
      const origVendorId = product.vendorId || product.sourceId || product.source_id || '';

      setVendorName(origVendorName === 'Manual Entry' ? '' : origVendorName);
      setVendorId(origVendorId === 'MANUAL' ? '' : origVendorId);
      setIsCustomVendor(false);

      Promise.all([
        api.get('/vendors'),
        api.get('/products'),
        api.get('/categories')
      ])
        .then(([vRes, pRes, cRes]) => {
          if (vRes.success) {
            const list = vRes.data || [];
            setVendors(list);
            if (origVendorName && !origVendorId) {
              const matched = list.find(v => v.name.toLowerCase() === origVendorName.toLowerCase());
              if (matched) setVendorId(matched.id);
            }
          }
          if (pRes.success) {
            setAllProducts((pRes.data || []).filter(p => p.id !== product.id));
          }
          if (cRes.success) {
            setCategories(cRes.data.productCategories || []);
          }
        })
        .catch(console.error);

      setQuantity(1);
      const defaultRate = product.costPrice || product.cost_price || '';
      setUnitRate(defaultRate);
      setReason('Defective product return');
      setSettlementMethod('Vendor Payable Adjustment');
      setInitialSettlement('');
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
      setReplacementMode('same');
      setDifferentSourceType('existing');
      setDiffSelectedProduct(null);
      setDiffSearch('');
      setDiffQty(1);
      setDiffPaymentMethod('Cash');
      setNewProdData({
        category: product.category || product.categoryName || 'Laptop',
        brand: '',
        model: '',
        quantity: 1,
        costPrice: '',
        expectedSalePrice: '',
        specifications: '',
        condition: 'Used',
        lowStockAlert: 1
      });
      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });
    }
  }, [isOpen, product]);

  if (!product) return null;

  const currentStock = product.currentStock || 0;
  const numQty = parseInt(quantity || 0, 10);
  const rate = parseFloat(unitRate || 0);
  const totalAmount = numQty * rate;

  const isExchange = settlementMethod === 'Exchange' || settlementMethod === 'Product Replacement / Exchange' || settlementMethod === 'Exchange Credit';

  // Calculate Replacement Inward Value
  let replacementValue = 0;
  if (isExchange) {
    if (replacementMode === 'same') {
      replacementValue = totalAmount;
    } else if (differentSourceType === 'existing') {
      const pCost = diffSelectedProduct ? parseFloat(diffSelectedProduct.costPrice || diffSelectedProduct.cost_price || 0) : 0;
      replacementValue = diffQty * pCost;
    } else {
      const nCost = parseFloat(newProdData.costPrice || 0);
      const nQty = parseInt(newProdData.quantity || 1, 10);
      replacementValue = nQty * nCost;
    }
  }

  // Price Difference (Net impact)
  const priceDifference = replacementValue - totalAmount;
  const shopOwesVendor = priceDifference > 0.005;
  const vendorOwesShop = priceDifference < -0.005;
  const isZeroDifference = Math.abs(priceDifference) <= 0.005;

  const numSettled = initialSettlement === '' ? totalAmount : parseFloat(initialSettlement || 0);
  const remaining = Math.max(0, totalAmount - numSettled);

  const origVendorDisplay = product.vendorName || product.sourceName || product.source_name || product.vendor_name;
  const hasKnownVendor = origVendorDisplay && origVendorDisplay !== 'Manual Entry';

  const filteredProducts = diffSearch.trim().length >= 1
    ? allProducts.filter(p => {
        const q = diffSearch.toLowerCase();
        return (
          (p.code || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.model || '').toLowerCase().includes(q) ||
          (p.productName || '').toLowerCase().includes(q) ||
          (p.category || p.categoryName || '').toLowerCase().includes(q)
        );
      }).slice(0, 10)
    : allProducts.slice(0, 10);

  const executeVendorReturn = async () => {
    setSubmitting(true);
    try {
      const payload = {
        productId: product.id,
        vendorId: vendorId || null,
        vendorName: vendorName.trim(),
        quantity: numQty,
        unitRate: rate,
        amount: totalAmount,
        initialSettlement: numSettled,
        receivedNow: numSettled,
        settlementMethod: isExchange ? 'Product Replacement / Exchange' : settlementMethod,
        reason: reason.trim(),
        referenceId: referenceId.trim(),
        date
      };

      if (isExchange) {
        payload.replacementMode = replacementMode;
        if (replacementMode === 'same') {
          payload.sameReplacementQty = numQty;
        } else if (replacementMode === 'different') {
          if (differentSourceType === 'existing' && diffSelectedProduct) {
            payload.replacementProductData = {
              id: diffSelectedProduct.id,
              quantity: diffQty,
              brand: diffSelectedProduct.brand,
              model: diffSelectedProduct.model,
              costPrice: diffSelectedProduct.costPrice || diffSelectedProduct.cost_price || 0
            };
          } else if (differentSourceType === 'new') {
            payload.replacementProductData = {
              category: newProdData.category,
              categoryName: newProdData.category,
              brand: newProdData.brand.trim(),
              model: newProdData.model.trim(),
              quantity: parseInt(newProdData.quantity || 1, 10),
              costPrice: parseFloat(newProdData.costPrice || 0),
              expectedSalePrice: parseFloat(newProdData.expectedSalePrice || (parseFloat(newProdData.costPrice || 0) * 1.15)),
              specifications: newProdData.specifications.trim(),
              condition: newProdData.condition,
              lowStockAlert: parseInt(newProdData.lowStockAlert || 1, 10)
            };
          }
          payload.diffPaymentMethod = diffPaymentMethod;
        }
      }

      const res = await api.post('/invoices/vendor-return', payload);
      if (res.success) {
        if (isExchange) {
          if (replacementMode === 'same') {
            toast(`Vendor replacement processed! Stock for ${product.code} swapped with fresh unit.`);
          } else {
            toast(`Vendor exchange processed! Returned ${product.code} and added replacement stock.`);
          }
        } else {
          toast(`Vendor return processed! ${numQty} unit(s) of ${product.code} deducted from stock.`);
        }
        notifyBalanceUpdated();
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error processing vendor return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast('Vendor name is required for inventory return', 'error');
      return;
    }
    if (numQty <= 0 || numQty > currentStock) {
      toast(`Return quantity must be between 1 and available stock (${currentStock})`, 'error');
      return;
    }
    if (totalAmount <= 0) {
      toast('Valid refund rate is required', 'error');
      return;
    }

    if (isExchange && replacementMode === 'different') {
      if (differentSourceType === 'existing' && !diffSelectedProduct) {
        toast('Please select an existing replacement product from inventory', 'error');
        return;
      }
      if (differentSourceType === 'new') {
        if (!newProdData.brand.trim() || !newProdData.model.trim()) {
          toast('Brand and Model are required for the new incoming replacement product', 'error');
          return;
        }
        if (parseFloat(newProdData.costPrice || 0) <= 0) {
          toast('Valid cost price is required for the new replacement product', 'error');
          return;
        }
      }
    }

    // If Shop owes Vendor extra difference and paying via Cash/Online, check drawer balance
    if (isExchange && replacementMode === 'different' && shopOwesVendor && ['Cash', 'Online'].includes(diffPaymentMethod)) {
      try {
        const balRes = await api.get('/accounts/drawer-balance');
        if (balRes.success && balRes.data) {
          const available = diffPaymentMethod === 'Cash' ? balRes.data.cash : balRes.data.online;
          if (priceDifference > available + 0.005) {
            setBalanceWarningModal({
              isOpen: true,
              availableBalance: available,
              requiredAmount: priceDifference,
              paymentMethod: diffPaymentMethod
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Could not verify drawer balance for vendor exchange difference:', err);
      }
    }

    await executeVendorReturn();
  };

  return (
    <>
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeVendorReturn}
        paymentMethod={balanceWarningModal.paymentMethod}
        requiredAmount={balanceWarningModal.requiredAmount}
        availableBalance={balanceWarningModal.availableBalance}
        isSubmitting={submitting}
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Return Product to Vendor"
        subtitle={`${product.code} — ${product.brand} ${product.model || product.productName} (Stock: ${currentStock})`}
        wide={true}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="vendorReturnForm"
              className="btn danger"
              disabled={submitting || numQty > currentStock}
            >
              {submitting ? 'Processing...' : `Confirm Return (${money(totalAmount)})`}
            </button>
          </>
        }
      >
        <form id="vendorReturnForm" onSubmit={handleSubmit}>
          {/* Origin Info Box */}
          {hasKnownVendor && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Store size={16} style={{ color: '#2563eb' }} />
                <div>
                  <span style={{ color: '#1e40af', fontWeight: 600 }}>Original Purchase Vendor: </span>
                  <strong style={{ color: '#0f172a' }}>{origVendorDisplay}</strong>
                  {product.purchaseInvoiceNo && (
                    <span style={{ marginLeft: 8, color: '#64748b' }}>
                      (Invoice #{product.purchaseInvoiceNo})
                    </span>
                  )}
                </div>
              </div>
              <div style={{ color: '#1e40af', fontWeight: 600 }}>
                Purchase Cost: {money(product.costPrice || product.cost_price || 0)}/unit
              </div>
            </div>
          )}

          <div className="form-grid">
            {/* Vendor selection */}
            <div className="field span-6">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Return To Vendor / Supplier *</span>
                {hasKnownVendor && !isCustomVendor && (
                  <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 500 }}>
                    ✓ Original: {origVendorDisplay}
                  </span>
                )}
              </label>
              <select
                className="select"
                value={isCustomVendor ? '__custom__' : (vendorId || (vendorName ? '__custom__' : ''))}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    setIsCustomVendor(true);
                    setVendorId('');
                    setVendorName('');
                  } else if (val === '') {
                    setIsCustomVendor(false);
                    setVendorId('');
                    setVendorName('');
                  } else {
                    setIsCustomVendor(false);
                    const found = vendors.find(v => v.id === val);
                    if (found) {
                      setVendorId(found.id);
                      setVendorName(found.name);
                    }
                  }
                }}
                required={!isCustomVendor}
              >
                <option value="">Select Vendor to Return To...</option>
                {origVendorDisplay && !vendors.some(v => v.name.toLowerCase() === origVendorDisplay.toLowerCase()) && (
                  <option value="__orig__">★ Original Vendor: {origVendorDisplay}</option>
                )}
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.contact ? `— ${v.contact}` : ''}
                  </option>
                ))}
                <option value="__custom__">+ Specify Other / New Vendor...</option>
              </select>

              {isCustomVendor && (
                <div style={{ marginTop: 6 }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="Type New Vendor Name..."
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="field span-3">
              <label>Return Quantity (Stock: {currentStock}) *</label>
              <input
                className="input"
                type="number"
                min="1"
                max={currentStock}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="field span-3">
              <label>Refund Rate (PKR) *</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={unitRate}
                onChange={(e) => setUnitRate(e.target.value)}
                placeholder={String(product.costPrice || 0)}
                required
              />
            </div>

            <div className="field span-4">
              <label>Settlement Method *</label>
              <select
                className="select"
                value={settlementMethod}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettlementMethod(val);
                  if (val === 'Exchange') {
                    setInitialSettlement(String(totalAmount));
                  }
                }}
              >
                <option value="Vendor Payable Adjustment">Deduct from Vendor Payable (Udhar)</option>
                <option value="Cash">Cash Refund Received</option>
                <option value="Online">Online Bank Transfer Received</option>
                <option value="Exchange">Product Replacement / Exchange</option>
              </select>
            </div>

            <div className="field span-4">
              <label>Settled Amount (Default: Full)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={initialSettlement}
                onChange={(e) => setInitialSettlement(e.target.value)}
                placeholder={`Full: ${totalAmount}`}
              />
            </div>

            <div className="field span-4">
              <label>Return Slip / Reference</label>
              <input
                className="input"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="RMA / Courier Tracking / Slip #"
              />
            </div>

            <div className="field span-12">
              <label>Reason for Return *</label>
              <input
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Faulty motherboard, dead on arrival, wrong specs"
                required
              />
            </div>

            {/* Product Replacement / Exchange Master Box */}
            {isExchange && (
              <div className="span-12" style={{
                marginTop: 8,
                padding: '16px 18px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                    <ArrowRightLeft size={16} color="#2563eb" /> Vendor Replacement & Stock Inward Setup
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Return Value Credit: <strong style={{ color: '#0f172a' }}>{money(totalAmount)}</strong>
                  </div>
                </div>

                {/* Replacement Mode Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  <button
                    type="button"
                    className={`btn ${replacementMode === 'same' ? 'primary' : 'soft'}`}
                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 12 }}
                    onClick={() => setReplacementMode('same')}
                  >
                    <RefreshCw size={15} /> 1. Same Product Replacement (1-to-1 Swap)
                  </button>
                  <button
                    type="button"
                    className={`btn ${replacementMode === 'different' ? 'primary' : 'soft'}`}
                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 12 }}
                    onClick={() => setReplacementMode('different')}
                  >
                    <Layers size={15} /> 2. Different Product Exchange (New Stock Inward)
                  </button>
                </div>

                {/* MODE 1: SAME PRODUCT REPLACEMENT */}
                {replacementMode === 'same' && (
                  <div style={{
                    padding: '12px 16px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div>
                      <strong>1-to-1 Same Model Stock Swap:</strong> {numQty} unit(s) of <strong>{product.code} ({product.brand} {product.model || product.productName})</strong> will be returned to vendor, and fresh replacement unit(s) of the same model will be restocked into inventory.
                      <div style={{ marginTop: 3, fontWeight: 600, color: '#15803d' }}>
                        Financial Difference: PKR 0.00 (Equal Value Replacement)
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: DIFFERENT PRODUCT REPLACEMENT */}
                {replacementMode === 'different' && (
                  <div style={{
                    padding: '14px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8
                  }}>
                    {/* Sub-tab: Existing vs Brand New Model */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        Incoming Replacement Stock Source:
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className={`btn small ${differentSourceType === 'existing' ? 'primary' : 'soft'}`}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => setDifferentSourceType('existing')}
                        >
                          <Search size={12} style={{ marginRight: 4 }} /> Select Existing Model
                        </button>
                        <button
                          type="button"
                          className={`btn small ${differentSourceType === 'new' ? 'primary' : 'soft'}`}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => setDifferentSourceType('new')}
                        >
                          <PlusCircle size={12} style={{ marginRight: 4 }} /> Enter Brand New Model
                        </button>
                      </div>
                    </div>

                    {/* 2.A: Existing Model Select & Search */}
                    {differentSourceType === 'existing' && (
                      <div>
                        {/* Quick filter search */}
                        <div style={{ position: 'relative', marginBottom: 8 }}>
                          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                          <input
                            className="input"
                            style={{ paddingLeft: 32 }}
                            placeholder="Type to filter existing models (e.g. Dell, iPhone, Screen, RAM)..."
                            value={diffSearch}
                            onChange={(e) => setDiffSearch(e.target.value)}
                          />
                        </div>

                        {/* Direct Select Dropdown */}
                        <div style={{ marginBottom: 10 }}>
                          <select
                            className="select"
                            value={diffSelectedProduct?.id || ''}
                            onChange={(e) => {
                              const found = allProducts.find(p => p.id === e.target.value);
                              setDiffSelectedProduct(found || null);
                              if (found) setDiffQty(1);
                            }}
                            required={differentSourceType === 'existing'}
                          >
                            <option value="">-- Click to Select Replacement Model from Inventory ({filteredProducts.length} models available) --</option>
                            {filteredProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.code} — {p.brand} {p.model || p.productName} ({p.category || p.categoryName || 'General'}) | Current Stock: {p.currentStock || 0} | Unit Cost: PKR {parseFloat(p.costPrice || p.cost_price || 0).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {diffSelectedProduct ? (
                          <div style={{
                            padding: '10px 14px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 6,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                                ✓ Selected: {diffSelectedProduct.code} — {diffSelectedProduct.brand} {diffSelectedProduct.model || diffSelectedProduct.productName}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Unit Cost: {money(diffSelectedProduct.costPrice || diffSelectedProduct.cost_price || 0)} •
                                Stock after inward: {(diffSelectedProduct.currentStock || 0) + diffQty}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Qty to Inward:</label>
                              <input
                                className="input"
                                type="number"
                                min="1"
                                style={{ width: 80 }}
                                value={diffQty}
                                onChange={(e) => setDiffQty(Math.max(1, parseInt(e.target.value || 1, 10)))}
                                required
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                            <Package size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Search and select a product from inventory above
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2.B: Brand New Model Direct Entry Form */}
                    {differentSourceType === 'new' && (
                      <div style={{
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#334155', marginBottom: 8 }}>
                          Enter Brand New Replacement Model Details:
                        </div>
                        <div className="form-grid">
                          <div className="field span-4">
                            <label>Category *</label>
                            <select
                              className="select"
                              value={newProdData.category}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, category: e.target.value }))}
                              required
                            >
                              {categories.length > 0 ? (
                                categories.map((c, i) => (
                                  <option key={i} value={c.name || c}>{c.name || c}</option>
                                ))
                              ) : (
                                <>
                                  <option value="Laptop">Laptop</option>
                                  <option value="LCD / Screen">LCD / Screen</option>
                                  <option value="Mobile">Mobile</option>
                                  <option value="Accessories">Accessories</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div className="field span-4">
                            <label>Brand *</label>
                            <input
                              className="input"
                              placeholder="e.g. Dell, HP, Lenovo"
                              value={newProdData.brand}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, brand: e.target.value }))}
                              required
                            />
                          </div>

                          <div className="field span-4">
                            <label>Model / Product Name *</label>
                            <input
                              className="input"
                              placeholder="e.g. Latitude 5420 / ThinkPad"
                              value={newProdData.model}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, model: e.target.value }))}
                              required
                            />
                          </div>

                          <div className="field span-4">
                            <label>Quantity to Inward *</label>
                            <input
                              className="input"
                              type="number"
                              min="1"
                              value={newProdData.quantity}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value || 1, 10)) }))}
                              required
                            />
                          </div>

                          <div className="field span-4">
                            <label>Cost Price (PKR) *</label>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={newProdData.costPrice}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, costPrice: e.target.value }))}
                              required
                            />
                          </div>

                          <div className="field span-4">
                            <label>Expected Sale Price (PKR)</label>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Optional"
                              value={newProdData.expectedSalePrice}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, expectedSalePrice: e.target.value }))}
                            />
                          </div>

                          <div className="field span-12">
                            <label>Specifications / Description (Optional)</label>
                            <input
                              className="input"
                              placeholder="e.g. Core i7 11th Gen, 16GB RAM, 512GB SSD"
                              value={newProdData.specifications}
                              onChange={(e) => setNewProdData(prev => ({ ...prev, specifications: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2.C: Live Financial Price Difference Card */}
                    {replacementValue > 0 && (
                      <div style={{
                        marginTop: 12,
                        padding: '12px 16px',
                        background: shopOwesVendor ? '#fef2f2' : vendorOwesShop ? '#f0fdf4' : '#f8fafc',
                        border: `1.5px solid ${shopOwesVendor ? '#fca5a5' : vendorOwesShop ? '#86efac' : '#cbd5e1'}`,
                        borderRadius: 8
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: shopOwesVendor ? '#991b1b' : vendorOwesShop ? '#166534' : '#475569' }}>
                              {shopOwesVendor ? '⚠️ Model Upgrade — Shop Owes Difference to Vendor' : vendorOwesShop ? '✓ Model Downgrade — Vendor Refunds Difference to Shop' : '✓ Equal Value Model Exchange'}
                            </div>
                            <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                              Return Value: <strong>{money(totalAmount)}</strong> &nbsp;|&nbsp; Replacement Value: <strong>{money(replacementValue)}</strong>
                            </div>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: shopOwesVendor ? '#dc2626' : vendorOwesShop ? '#16a34a' : '#0f172a', fontFamily: 'monospace' }}>
                            {shopOwesVendor ? `+${money(priceDifference)}` : vendorOwesShop ? `-${money(Math.abs(priceDifference))}` : 'PKR 0.00'}
                          </div>
                        </div>

                        {/* Settlement Channel for Upgrade Difference */}
                        {shopOwesVendor && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>
                              How will the shop pay the extra difference of {money(priceDifference)}?
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['Cash', 'Online', 'Vendor Payable Adjustment'].map(m => (
                                <button
                                  key={m}
                                  type="button"
                                  className={`btn small ${diffPaymentMethod === m ? 'danger' : 'soft'}`}
                                  style={{ fontSize: 11, padding: '3px 8px' }}
                                  onClick={() => setDiffPaymentMethod(m)}
                                >
                                  {m === 'Vendor Payable Adjustment' ? 'Add to Vendor Udhar' : m}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="span-12 summary-box" style={{ marginTop: 8 }}>
              <div className="summary-row">
                <span>Total Return Value ({numQty} × {money(rate)})</span>
                <strong>{money(totalAmount)}</strong>
              </div>
              <div className="summary-row">
                <span>Settlement Mode</span>
                <strong>{settlementMethod}</strong>
              </div>
              <div className="summary-row">
                <span>Settled Value</span>
                <strong>{money(numSettled)}</strong>
              </div>
              {remaining > 0 && (
                <div className="summary-row" style={{ color: 'var(--warning)' }}>
                  <span>Remaining Pending Credit (Vendor Receivable)</span>
                  <strong>{money(remaining)}</strong>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
