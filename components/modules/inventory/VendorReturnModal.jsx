'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, RefreshCw, Layers, CheckCircle2, ArrowRightLeft, Search, Package } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

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

  // Replacement / Exchange states
  const [replacementMode, setReplacementMode] = useState('same'); // 'same' | 'different'
  const [sameReplacementQty, setSameReplacementQty] = useState(1);

  // Different product — select from inventory
  const [allProducts, setAllProducts] = useState([]);
  const [diffSearch, setDiffSearch] = useState('');
  const [diffSelectedProduct, setDiffSelectedProduct] = useState(null);
  const [diffQty, setDiffQty] = useState(1);
  const [showDiffDropdown, setShowDiffDropdown] = useState(false);
  const diffRef = useRef(null);

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
        api.get('/products')
      ])
        .then(([vRes, pRes]) => {
          if (vRes.success) {
            const list = vRes.data || [];
            setVendors(list);
            if (origVendorName && !origVendorId) {
              const matched = list.find(v => v.name.toLowerCase() === origVendorName.toLowerCase());
              if (matched) setVendorId(matched.id);
            }
          }
          if (pRes.success) {
            // Exclude the product being returned
            setAllProducts((pRes.data || []).filter(p => p.id !== product.id));
          }
        })
        .catch(console.error);

      setQuantity(1);
      setSameReplacementQty(1);
      const defaultRate = product.costPrice || product.cost_price || '';
      setUnitRate(defaultRate);
      setReason('Defective product return');
      setSettlementMethod('Vendor Payable Adjustment');
      setInitialSettlement('');
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
      setReplacementMode('same');
      setDiffSelectedProduct(null);
      setDiffSearch('');
      setDiffQty(1);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const currentStock = product.currentStock || 0;
  const numQty = parseInt(quantity || 0, 10);
  const rate = parseFloat(unitRate || 0);
  const totalAmount = numQty * rate;

  const isExchange = settlementMethod === 'Exchange' || settlementMethod === 'Product Replacement / Exchange' || settlementMethod === 'Exchange Credit';

  // For settlement calculations
  const numSettled = initialSettlement === '' ? totalAmount : parseFloat(initialSettlement || 0);
  const remaining = Math.max(0, totalAmount - numSettled);

  const origVendorDisplay = product.vendorName || product.sourceName || product.source_name || product.vendor_name;
  const hasKnownVendor = origVendorDisplay && origVendorDisplay !== 'Manual Entry';

  // Filtered list for different-product search
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

  const diffSelectedValue = diffQty * (diffSelectedProduct ? parseFloat(diffSelectedProduct.costPrice || diffSelectedProduct.cost_price || 0) : 0);

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

    if (isExchange && replacementMode === 'different' && !diffSelectedProduct) {
      toast('Please select a replacement product from inventory', 'error');
      return;
    }

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
        settlementMethod: isExchange ? 'Exchange Credit' : settlementMethod,
        reason: reason.trim(),
        referenceId: referenceId.trim(),
        date
      };

      if (isExchange) {
        payload.replacementMode = replacementMode;
        if (replacementMode === 'same') {
          payload.sameReplacementQty = parseInt(sameReplacementQty || numQty, 10);
        } else {
          // Existing inventory product — just add stock
          payload.replacementProductId = diffSelectedProduct.id;
          payload.replacementProductQty = diffQty;
        }
      }

      const res = await api.post('/invoices/vendor-return', payload);
      if (res.success) {
        toast(`Vendor return processed! ${numQty} units deducted from stock.${isExchange ? ' Replacement stock updated.' : ''}`);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error processing vendor return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
              onChange={(e) => {
                const val = e.target.value;
                setQuantity(val);
                if (replacementMode === 'same') setSameReplacementQty(val);
              }}
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

          {/* Product Replacement / Exchange Details Box */}
          {isExchange && (
            <div className="span-12" style={{
              marginTop: 6,
              padding: '14px 16px',
              backgroundColor: 'rgba(59, 130, 246, 0.04)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                  <ArrowRightLeft size={16} /> Incoming Replacement Product Configuration
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Return Credit Value: <strong style={{ color: 'var(--text)' }}>{money(totalAmount)}</strong>
                </div>
              </div>

              {/* Toggle: Same Product vs Different Product */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  className={`btn small ${replacementMode === 'same' ? 'primary' : 'soft'}`}
                  style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}
                  onClick={() => setReplacementMode('same')}
                >
                  <RefreshCw size={14} /> 1. Same Product Replacement (Same Model)
                </button>
                <button
                  type="button"
                  className={`btn small ${replacementMode === 'different' ? 'primary' : 'soft'}`}
                  style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}
                  onClick={() => setReplacementMode('different')}
                >
                  <Layers size={14} /> 2. Different Product Replacement (New Model / Specs)
                </button>
              </div>

              {/* 1. Same Product Replacement View */}
              {replacementMode === 'same' && (
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border)',
                  borderRadius: 6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                        {product.code} — {product.brand} {product.model || product.productName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        Category: {product.category || product.categoryName} • Unit Cost: {money(product.costPrice || product.cost_price || 0)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Replacement Quantity Received:</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max={numQty}
                        style={{ width: 90 }}
                        value={sameReplacementQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value || 1, 10);
                          setSameReplacementQty(Math.min(Math.max(1, val), numQty));
                        }}
                        required
                      />
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> {sameReplacementQty} unit(s) of this exact product will be added directly into inventory stock upon saving.
                  </p>
                </div>
              )}

              {/* 2. Different Product — Select from Inventory */}
              {replacementMode === 'different' && (
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border)',
                  borderRadius: 6
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', marginBottom: 10 }}>
                    Select Replacement Product from Inventory:
                  </div>

                  {/* Search box */}
                  <div ref={diffRef} style={{ position: 'relative', marginBottom: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                      <input
                        className="input"
                        style={{ paddingLeft: 32 }}
                        placeholder="Search by code, brand, model, category..."
                        value={diffSearch}
                        onChange={(e) => {
                          setDiffSearch(e.target.value);
                          setDiffSelectedProduct(null);
                          setShowDiffDropdown(true);
                        }}
                        onFocus={() => setShowDiffDropdown(true)}
                      />
                    </div>

                    {showDiffDropdown && filteredProducts.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: 'var(--card-bg, #fff)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        maxHeight: 220,
                        overflowY: 'auto',
                        marginTop: 2
                      }}>
                        {filteredProducts.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={() => {
                              setDiffSelectedProduct(p);
                              setDiffSearch(`${p.code} — ${p.brand} ${p.model || p.productName}`);
                              setShowDiffDropdown(false);
                              setDiffQty(1);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg, #f5f5f5)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
                                {p.code} — {p.brand} {p.model || p.productName}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                {p.category || p.categoryName} • Stock: {p.currentStock || 0}
                              </div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                              {money(p.costPrice || p.cost_price || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected product info + qty */}
                  {diffSelectedProduct ? (
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(5, 150, 105, 0.05)',
                      border: '1px solid rgba(5, 150, 105, 0.3)',
                      borderRadius: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                          ✓ {diffSelectedProduct.code} — {diffSelectedProduct.brand} {diffSelectedProduct.model || diffSelectedProduct.productName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {diffSelectedProduct.category || diffSelectedProduct.categoryName} •
                          Current Stock: {diffSelectedProduct.currentStock || 0} •
                          Cost: {money(diffSelectedProduct.costPrice || diffSelectedProduct.cost_price || 0)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Qty to Add:</label>
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
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '6px 0' }}>
                      <Package size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Search and select a product from inventory above
                    </div>
                  )}

                  {/* Value summary */}
                  {diffSelectedProduct && diffSelectedValue > 0 && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>Replacement Stock Value: <strong>{money(diffSelectedValue)}</strong> ({diffQty} × {money(diffSelectedProduct.costPrice || diffSelectedProduct.cost_price || 0)})</span>
                      <span>Return Credit: <strong>{money(totalAmount)}</strong></span>
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
  );
}
