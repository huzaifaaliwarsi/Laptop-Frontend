'use client';

import React, { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import ProductSearchSelect from '../../common/ProductSearchSelect';
import CustomerSearchInput from '../../common/CustomerSearchInput';
import { formatProductTitle } from '../../../utils/formatters';
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
  const [customerId, setCustomerId] = useState(null);
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
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [isPriceManuallyOverridden, setIsPriceManuallyOverridden] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [extraServiceDesc, setExtraServiceDesc] = useState('');
  const [extraServiceCharge, setExtraServiceCharge] = useState('');

  // Selected product object from dropdown / card selection
  const selectedProduct = productsList.find(p => p.id === selectedProductId) || (initialProduct && initialProduct.id === selectedProductId ? initialProduct : null);

  const fetchProductBatches = (productId, prodObj) => {
    if (!productId) {
      setSelectedBatches([]);
      return;
    }
    setLoadingBatches(true);
    api.get(`/products/${productId}/batches`)
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const active = res.data.filter(b => (b.quantity || 0) > 0 && b.status !== 'Expired');
          setSelectedBatches(active);
        } else {
          setSelectedBatches([]);
        }
      })
      .catch(() => setSelectedBatches([]))
      .finally(() => setLoadingBatches(false));
  };

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
        setIsPriceManuallyOverridden(false);
        fetchProductBatches(initialProduct.id, initialProduct);
      } else {
        setSelectedProductId('');
        setSelectedQty(1);
        setCustomSalePrice('');
        setSelectedBatches([]);
        setIsPriceManuallyOverridden(false);
      }

      setCartItems([]);
      setCustomerName('');
      setContact('');
      setCustomerId(null);
      setPaid('');
      setIsManualPaid(false);
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, initialProduct]);

  // Reactive FIFO Allocation calculation for currently selected product & quantity
  const fifoAlloc = React.useMemo(() => {
    if (!selectedProductId || !selectedProduct) return null;

    const requestedQty = Math.max(1, parseInt(selectedQty || 1, 10));

    // Calculate how many units of this product are already staged in the cart
    const cartReservedQty = cartItems
      .filter(item => item.productId === selectedProductId && !item.isService)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);

    let remainingToSkip = cartReservedQty;
    let remainingToAllocate = requestedQty;
    const slices = [];

    const activeBatches = selectedBatches.filter(b => (b.quantity || 0) > 0 && b.status !== 'Expired');

    for (const b of activeBatches) {
      let bQty = b.quantity || 0;
      if (remainingToSkip > 0) {
        const skipped = Math.min(remainingToSkip, bQty);
        bQty -= skipped;
        remainingToSkip -= skipped;
      }
      if (bQty <= 0) continue;
      if (remainingToAllocate <= 0) break;

      const take = Math.min(remainingToAllocate, bQty);
      slices.push({
        batchId: b.id,
        batchNo: b.batchNo,
        quantity: take,
        unitPrice: parseFloat(b.sellingPrice || 0),
        costPrice: parseFloat(b.costPrice || 0),
        expiryDate: b.expiryDate
      });
      remainingToAllocate -= take;
    }

    // Fallback if no batches found but product has expected price
    if (slices.length === 0) {
      const defaultPrice = parseFloat(selectedProduct.expectedSalePrice !== undefined && selectedProduct.expectedSalePrice !== null ? selectedProduct.expectedSalePrice : (selectedProduct.costPrice || 0));
      return {
        slices: [{
          batchId: null,
          batchNo: null,
          quantity: requestedQty,
          unitPrice: defaultPrice,
          costPrice: parseFloat(selectedProduct.costPrice || 0)
        }],
        totalCalculated: requestedQty * defaultPrice,
        totalQty: requestedQty,
        avgPrice: defaultPrice,
        isMultiBatch: false,
        activeBatchPrice: defaultPrice,
        activeBatchRemaining: Math.max(0, (selectedProduct.currentStock || 0) - cartReservedQty)
      };
    }

    const totalCalculated = slices.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
    const totalQty = slices.reduce((sum, s) => sum + s.quantity, 0);
    const avgPrice = totalQty > 0 ? totalCalculated / totalQty : 0;
    const activeBatchPrice = slices[0]?.unitPrice || 0;
    const activeBatchRemaining = slices[0]?.quantity || 0;

    return {
      slices,
      totalCalculated,
      totalQty,
      avgPrice,
      isMultiBatch: slices.length > 1,
      activeBatchPrice,
      activeBatchRemaining,
      unallocated: remainingToAllocate
    };
  }, [selectedProductId, selectedProduct, selectedQty, selectedBatches, cartItems]);

  // Keep price input updated with active FIFO rate unless cashier explicitly typed an override
  useEffect(() => {
    if (selectedProductId && !isPriceManuallyOverridden && fifoAlloc) {
      if (fifoAlloc.isMultiBatch) {
        setCustomSalePrice(fifoAlloc.avgPrice ? fifoAlloc.avgPrice.toFixed(2) : '');
      } else if (fifoAlloc.activeBatchPrice !== undefined) {
        setCustomSalePrice(String(fifoAlloc.activeBatchPrice));
      }
    }
  }, [selectedProductId, selectedQty, isPriceManuallyOverridden, fifoAlloc]);

  // Auto-sync full paid amount when cart total changes
  useEffect(() => {
    if (!isManualPaid) {
      const pTot = cartItems.filter(i => !i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
      const sTot = cartItems.filter(i => i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
      const total = pTot + sTot;
      setPaid(total > 0 ? String(total) : '');
    }
  }, [cartItems, isManualPaid]);

  const handleProductSelect = (productOrId) => {
    setIsPriceManuallyOverridden(false);
    if (!productOrId) {
      setSelectedProductId('');
      setSelectedQty(1);
      setCustomSalePrice('');
      setSelectedBatches([]);
      return;
    }
    const id = typeof productOrId === 'object' ? productOrId.id : productOrId;
    const prod = typeof productOrId === 'object' ? productOrId : productsList.find(p => p.id === id);
    setSelectedProductId(id);
    setSelectedQty(1);
    setCustomSalePrice('');
    fetchProductBatches(id, prod);
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

    const currentCartQty = cartItems
      .filter(i => i.productId === prod.id && !i.isService)
      .reduce((s, i) => s + (i.quantity || 0), 0);

    if (currentCartQty + qty > prod.currentStock) {
      toast(`Invalid quantity. Available stock: ${prod.currentStock} (already ${currentCartQty} in cart)`, 'error');
      return;
    }

    // Check if cashier explicitly entered a manual negotiated single price override
    const hasManualTyped = customSalePrice !== '' && customSalePrice !== null && customSalePrice !== undefined;
    const typedPrice = hasManualTyped ? parseFloat(customSalePrice) : null;
    const isExplicitOverride = isPriceManuallyOverridden && typedPrice !== null && !isNaN(typedPrice);

    if (isExplicitOverride) {
      if (typedPrice < 0) {
        toast('Selling price cannot be blank or negative', 'error');
        return;
      }
      setCartItems(prev => [...prev, {
        productId: prod.id,
        code: prod.code,
        name: formatProductTitle(prod),
        category: prod.categoryName || prod.category || 'Product',
        description: prod.specifications || '',
        quantity: qty,
        costPrice: parseFloat(prod.costPrice || 0),
        salePrice: typedPrice,
        maxStock: prod.currentStock
      }]);
    } else if (fifoAlloc && fifoAlloc.slices && fifoAlloc.slices.length > 0) {
      // Strict FIFO Allocation (itemizes across batches when quantity crosses batches)
      const newItems = fifoAlloc.slices.map((slice, sIdx) => {
        const batchSuffix = fifoAlloc.slices.length > 1 ? ` (Batch ${slice.batchNo || sIdx + 1})` : '';
        return {
          productId: prod.id,
          batchId: slice.batchId,
          code: prod.code,
          name: `${formatProductTitle(prod)}${batchSuffix}`,
          category: prod.categoryName || prod.category || 'Product',
          description: prod.specifications || '',
          quantity: slice.quantity,
          costPrice: slice.costPrice || parseFloat(prod.costPrice || 0),
          salePrice: slice.unitPrice,
          maxStock: prod.currentStock
        };
      });

      setCartItems(prev => [...prev, ...newItems]);
    } else {
      const defaultPrice = parseFloat(prod.expectedSalePrice !== undefined && prod.expectedSalePrice !== null ? prod.expectedSalePrice : (prod.costPrice || 0));
      setCartItems(prev => [...prev, {
        productId: prod.id,
        code: prod.code,
        name: formatProductTitle(prod),
        category: prod.categoryName || prod.category || 'Product',
        description: prod.specifications || '',
        quantity: qty,
        costPrice: parseFloat(prod.costPrice || 0),
        salePrice: defaultPrice,
        maxStock: prod.currentStock
      }]);
    }

    // Reset selection row fields
    setSelectedProductId('');
    setSelectedQty(1);
    setCustomSalePrice('');
    setSelectedBatches([]);
    setIsPriceManuallyOverridden(false);
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
        customerId: customerId || null,
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
        if (!inv.items && res.data?.items) {
          inv.items = res.data.items;
        }
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
            <CustomerSearchInput
              customerName={customerName}
              setCustomerName={setCustomerName}
              contact={contact}
              setContact={setContact}
              customerId={customerId}
              setCustomerId={setCustomerId}
              required={true}
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
                <ProductSearchSelect
                  products={productsList}
                  selectedProductId={selectedProductId}
                  onSelect={handleProductSelect}
                  placeholder="Search code, brand, model, barcode..."
                />
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
                      {fifoAlloc?.isMultiBatch ? (
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>
                          FIFO Avg: PKR {fifoAlloc.avgPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span>
                          Exp: PKR {Number(fifoAlloc?.activeBatchPrice || selectedProduct.expectedSalePrice || selectedProduct.costPrice || 0).toLocaleString()}
                        </span>
                      )}
                    </span>
                  )}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customSalePrice}
                  onChange={(e) => {
                    setIsPriceManuallyOverridden(true);
                    setCustomSalePrice(e.target.value);
                  }}
                  placeholder={selectedProduct ? `Expected: ${Number(fifoAlloc?.activeBatchPrice || selectedProduct.expectedSalePrice || selectedProduct.costPrice || 0).toLocaleString()}` : 'Sale Price'}
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

            {fifoAlloc?.isMultiBatch && (
              <div style={{
                marginTop: 10,
                padding: '8px 12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                fontSize: 12,
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    FIFO BATCH ALLOCATION
                  </span>
                  <span>
                    {fifoAlloc.slices.map(s => `${s.quantity} pcs @ PKR ${s.unitPrice.toLocaleString()}`).join(' + ')}
                  </span>
                </span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>
                  Line Total: PKR {fifoAlloc.totalCalculated.toLocaleString()}
                </span>
              </div>
            )}

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong>{item.code ? `[${item.code}] ` : ''}{item.name}</strong>
                            {item.category && (
                              <span style={{ fontSize: 9.5, background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.description && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{item.description}</div>}
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
