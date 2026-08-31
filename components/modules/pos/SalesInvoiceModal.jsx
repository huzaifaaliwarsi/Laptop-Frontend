'use client';

import React, { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function SalesInvoiceModal({
  isOpen,
  onClose,
  initialProduct = null,
  onSuccess
}) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');
  const [paid, setPaid] = useState('');
  const [isManualPaid, setIsManualPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stock Selection State
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [customSalePrice, setCustomSalePrice] = useState('');

  const [cartItems, setCartItems] = useState([]);
  const [extraServiceDesc, setExtraServiceDesc] = useState('');
  const [extraServiceCharge, setExtraServiceCharge] = useState('');

  // Selected product object from dropdown / card selection
  const selectedProduct = productsList.find(p => p.id === selectedProductId) || (initialProduct && initialProduct.id === selectedProductId ? initialProduct : null);

  // Load products for dropdown and handle initial selection
  useEffect(() => {
    if (isOpen) {
      api.get('/products?inStockOnly=true')
        .then(res => {
          if (res.success) setProductsList(res.data || []);
        })
        .catch(console.error);

      if (initialProduct) {
        setSelectedProductId(initialProduct.id);
        setSelectedQty(1);
        setCustomSalePrice('');
      } else {
        setSelectedProductId('');
        setSelectedQty(1);
        setCustomSalePrice('');
      }

      setCartItems([]);
      setCustomerName('');
      setContact('');
      setPaid('');
      setIsManualPaid(false);
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, initialProduct]);

  // Auto-sync full paid amount when cart total changes
  useEffect(() => {
    if (!isManualPaid) {
      const pTot = cartItems.filter(i => !i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
      const sTot = cartItems.filter(i => i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
      const total = pTot + sTot;
      setPaid(total > 0 ? String(total) : '');
    }
  }, [cartItems, isManualPaid]);

  const handleProductSelect = (id) => {
    setSelectedProductId(id);
    setSelectedQty(1);
    setCustomSalePrice('');
  };

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast('Please select a product first', 'error');
      return;
    }
    const prod = productsList.find(p => p.id === selectedProductId) || (initialProduct && initialProduct.id === selectedProductId ? initialProduct : null);
    if (!prod) {
      toast('Selected product not found', 'error');
      return;
    }

    const qty = parseInt(selectedQty || 1, 10);
    if (isNaN(qty) || qty <= 0) {
      toast('Please enter a valid quantity greater than 0', 'error');
      return;
    }
    if (qty > prod.currentStock) {
      toast(`Invalid quantity. Available stock: ${prod.currentStock}`, 'error');
      return;
    }

    // Determine price: if user typed a value, use it; otherwise use expected/default price from product
    const defaultPrice = parseFloat(prod.expectedSalePrice !== undefined && prod.expectedSalePrice !== null ? prod.expectedSalePrice : (prod.costPrice || 0));
    let price = defaultPrice;

    if (customSalePrice !== '' && customSalePrice !== null && customSalePrice !== undefined) {
      price = parseFloat(customSalePrice);
      if (isNaN(price) || price < 0) {
        toast('Selling price cannot be blank or negative', 'error');
        return;
      }
    } else {
      if (isNaN(price) || price < 0) {
        toast('Please enter a valid selling price', 'error');
        return;
      }
    }

    setCartItems(prev => {
      const existingIndex = prev.findIndex(i => i.productId === prod.id && !i.isService);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + qty;
        if (newQty > prod.currentStock) {
          toast(`Cannot exceed available stock of ${prod.currentStock}`, 'error');
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          salePrice: price
        };
        return updated;
      }
      return [...prev, {
        productId: prod.id,
        code: prod.code,
        name: `${prod.brand} ${prod.model || prod.productName || ''}`.trim(),
        description: prod.specifications || '',
        quantity: qty,
        costPrice: parseFloat(prod.costPrice || 0),
        salePrice: price,
        maxStock: prod.currentStock
      }];
    });

    // Reset selection row fields
    setSelectedProductId('');
    setSelectedQty(1);
    setCustomSalePrice('');
  };

  const handleAddService = () => {
    if (!extraServiceDesc || !extraServiceCharge) return;
    const charge = parseFloat(extraServiceCharge);
    if (isNaN(charge) || charge <= 0) return;

    setCartItems(prev => [...prev, {
      isService: true,
      code: 'SRV',
      name: extraServiceDesc.trim(),
      description: 'Service / Software Charge',
      quantity: 1,
      costPrice: 0,
      salePrice: charge
    }]);

    setExtraServiceDesc('');
    setExtraServiceCharge('');
  };

  const handleRemoveItem = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const productTotal = cartItems.filter(i => !i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
  const serviceTotal = cartItems.filter(i => i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
  const grandTotal = productTotal + serviceTotal;
  const numPaid = paid === '' ? grandTotal : parseFloat(paid || 0);
  const balance = Math.max(0, grandTotal - numPaid);

  const [submitAction, setSubmitAction] = useState('save_preview');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast('Customer name is required', 'error');
      return;
    }
    if (cartItems.length === 0) {
      toast('Add at least one product or service line', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        contact: contact.trim(),
        date,
        paymentMethod,
        referenceId: referenceId.trim(),
        paid: numPaid,
        items: cartItems.map(i => ({
          productId: i.productId || null,
          itemType: i.isService ? 'service' : 'product',
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          costPrice: i.costPrice !== undefined ? i.costPrice : 0,
          salePrice: i.salePrice
        }))
      };

      const res = await api.post('/pos/sale', payload);
      if (res.success) {
        const inv = res.data?.invoice || {};
        const invNo = inv.invoice_no || inv.invoiceNo || inv.id || '';
        toast(`Sales Invoice ${invNo} saved successfully!`);
        onClose();
        if (onSuccess) {
          const shouldPreview = submitAction === 'save_preview';
          onSuccess(inv, shouldPreview);
        }
      }
    } catch (err) {
      toast(err.message || 'Error processing sales invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Sales Invoice"
      subtitle="POS Stock Retail Checkout"
      wide={true}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="salesInvoiceForm"
            className="btn"
            style={{ fontWeight: 700, backgroundColor: 'var(--bg)', borderColor: 'var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting || cartItems.length === 0}
            onClick={() => setSubmitAction('save')}
          >
            <Save size={15} /> Save Invoice
          </button>
          <button
            type="submit"
            form="salesInvoiceForm"
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting || cartItems.length === 0}
            onClick={() => setSubmitAction('save_preview')}
          >
            <Printer size={15} /> {submitting ? 'Generating...' : `Save & Print (${money(grandTotal)})`}
          </button>
        </div>
      }
    >
      <form id="salesInvoiceForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-4">
            <label>Customer Name *</label>
            <input
              className="input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in or Customer Name"
              required
            />
          </div>
          <div className="field span-4">
            <label>Contact Number</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="03001234567"
            />
          </div>
          <div className="field span-4">
            <label>Invoice Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="span-12 line-card">
            <div className="line-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Select Products from Inventory</strong>
              {selectedProduct && (
                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                  Stock Available: {selectedProduct.currentStock} units
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 320px', minWidth: 0, margin: 0 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                  Product *
                </label>
                <select
                  className="select"
                  style={{ width: '100%', textOverflow: 'ellipsis' }}
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                >
                  <option value="">Select product to add...</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.brand} {p.model || p.productName} ({p.condition}) [Stock: {p.currentStock}] — PKR {Number(p.expectedSalePrice || p.costPrice || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ width: 85, flex: '0 0 85px', margin: 0 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                  Quantity
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={selectedProduct ? selectedProduct.currentStock : undefined}
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(e.target.value)}
                  placeholder="Qty"
                  disabled={!selectedProductId}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field" style={{ width: 195, flex: '0 0 195px', margin: 0 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Selling Price (PKR) *</span>
                  {selectedProduct && (
                    <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 10 }}>
                      Exp: PKR {Number(selectedProduct.expectedSalePrice || selectedProduct.costPrice || 0).toLocaleString()}
                    </span>
                  )}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customSalePrice}
                  onChange={(e) => setCustomSalePrice(e.target.value)}
                  placeholder={selectedProduct ? `Expected: ${Number(selectedProduct.expectedSalePrice || selectedProduct.costPrice || 0).toLocaleString()}` : 'Sale Price'}
                  disabled={!selectedProductId}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field" style={{ width: 120, flex: '0 0 120px', margin: 0 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'transparent', marginBottom: 4, display: 'block', userSelect: 'none' }}>
                  Action
                </label>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleAddProduct}
                  style={{ width: '100%', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}
                  disabled={!selectedProductId}
                >
                  + Add Item
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #dce6f2' }}>
              <div className="form-grid">
                <div className="field span-6">
                  <input
                    className="input"
                    value={extraServiceDesc}
                    onChange={(e) => setExtraServiceDesc(e.target.value)}
                    placeholder="Add custom service or software installation (optional)"
                  />
                </div>
                <div className="field span-3">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraServiceCharge}
                    onChange={(e) => setExtraServiceCharge(e.target.value)}
                    placeholder="Service Charge PKR"
                  />
                </div>
                <div className="field span-3">
                  <button type="button" className="btn soft" onClick={handleAddService} style={{ width: '100%' }}>
                    + Add Service
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="span-12">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: 80 }}>Qty</th>
                    <th style={{ width: 140 }}>Rate</th>
                    <th style={{ width: 140 }}>Line Total</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.length > 0 ? (
                    cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.code ? `[${item.code}] ` : ''}{item.name}</strong>
                          {item.description && <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{item.description}</div>}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{money(item.salePrice)}</td>
                        <td><strong>{money(item.quantity * item.salePrice)}</strong></td>
                        <td>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ color: 'var(--danger)', border: 0, background: 'transparent' }}
                            onClick={() => handleRemoveItem(idx)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                        No items added to invoice yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="field span-4">
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

          <div className="field span-4">
            <label>Amount Paid (Default: Full Bill)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={paid}
              onChange={(e) => {
                setIsManualPaid(true);
                setPaid(e.target.value);
              }}
              placeholder="0.00"
            />
          </div>

          <div className="field span-4">
            <label>Reference / Note</label>
            <input
              className="input"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Transaction ref / Slip No."
            />
          </div>

          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>Products Subtotal</span>
              <strong>{money(productTotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Services Subtotal</span>
              <strong>{money(serviceTotal)}</strong>
            </div>
            <div className="summary-row total">
              <span>Grand Total</span>
              <strong>{money(grandTotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Received</span>
              <strong>{money(numPaid)}</strong>
            </div>
            <div className="summary-row" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              <span>Balance (Customer Receivable)</span>
              <strong>{money(balance)}</strong>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
