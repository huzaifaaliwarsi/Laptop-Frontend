'use client';

import React, { useState, useEffect } from 'react';
import { Save, Printer, Zap } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function CustomSaleModal({
  isOpen,
  onClose,
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

  // Custom Item Fields
  const [customItemName, setCustomItemName] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemCost, setCustomItemCost] = useState('');
  const [customItemSalePrice, setCustomItemSalePrice] = useState('');

  const [cartItems, setCartItems] = useState([]);
  const [extraServiceDesc, setExtraServiceDesc] = useState('');
  const [extraServiceCharge, setExtraServiceCharge] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCustomItemName('');
      setCustomItemDesc('');
      setCustomItemQty(1);
      setCustomItemCost('');
      setCustomItemSalePrice('');
      setExtraServiceDesc('');
      setExtraServiceCharge('');
      setCartItems([]);
      setCustomerName('');
      setContact('');
      setPaid('');
      setIsManualPaid(false);
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Auto-sync full paid amount when cart total changes
  useEffect(() => {
    if (!isManualPaid) {
      const pTot = cartItems.filter(i => !i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
      const sTot = cartItems.filter(i => i.isService).reduce((s, i) => s + (i.quantity * i.salePrice), 0);
      const total = pTot + sTot;
      setPaid(total > 0 ? String(total) : '');
    }
  }, [cartItems, isManualPaid]);

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      toast('Item / Product Title is required', 'error');
      return;
    }

    const qty = parseInt(customItemQty || 1, 10);
    if (isNaN(qty) || qty <= 0) {
      toast('Quantity must be at least 1', 'error');
      return;
    }

    const cost = parseFloat(customItemCost || 0);
    if (isNaN(cost) || cost < 0) {
      toast('Purchase cost cannot be negative', 'error');
      return;
    }

    const sale = parseFloat(customItemSalePrice || 0);
    if (isNaN(sale) || sale < 0) {
      toast('Customer sale price cannot be negative', 'error');
      return;
    }

    setCartItems(prev => [...prev, {
      isCustom: true,
      productId: null,
      code: 'CUSTOM',
      name: customItemName.trim(),
      description: customItemDesc.trim() || 'Direct Sourced Custom Item',
      quantity: qty,
      costPrice: cost,
      salePrice: sale
    }]);

    setCustomItemName('');
    setCustomItemDesc('');
    setCustomItemQty(1);
    setCustomItemCost('');
    setCustomItemSalePrice('');
    toast('Custom item added to bill!');
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
      toast('Please add at least one sourced item to the bill', 'error');
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
          productId: null,
          itemType: i.isService ? 'service' : 'custom_product',
          isCustom: true,
          code: i.code,
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          costPrice: i.costPrice !== undefined ? i.costPrice : 0,
          salePrice: i.salePrice
        }))
      };

      const res = await api.post('/pos/sale', payload);
      if (res.success) {
        toast(`Custom Sale Invoice ${res.data.invoice.invoiceNo} saved successfully!`);
        onClose();
        if (onSuccess) {
          const shouldPreview = submitAction === 'save_preview';
          onSuccess(res.data.invoice, shouldPreview);
        }
      }
    } catch (err) {
      toast(err.message || 'Error processing custom sale invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedProfit = (parseFloat(customItemSalePrice || 0) - parseFloat(customItemCost || 0)) * parseInt(customItemQty || 1, 10);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Sale (Direct Sourced)"
      subtitle="Source product externally & immediately sell to customer (No warehouse stock used or affected)"
      wide={true}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="customSaleForm"
            className="btn"
            style={{ fontWeight: 700, backgroundColor: 'var(--bg)', borderColor: 'var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting || cartItems.length === 0}
            onClick={() => setSubmitAction('save')}
          >
            <Save size={15} /> Save Invoice
          </button>
          <button
            type="submit"
            form="customSaleForm"
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
      <form id="customSaleForm" onSubmit={handleSubmit}>
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

          {/* Sourced Product Card */}
          <div className="span-12 line-card" style={{ background: 'rgba(248, 250, 252, 0.8)', border: '1px solid var(--border)' }}>
            <div className="line-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={16} color="var(--primary)" />
                <strong>Direct Sourced Product Details</strong>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Sourced externally & billed on the spot · No stock added or deducted
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                    Item / Product Title *
                  </label>
                  <input
                    className="input"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="e.g. Dell XPS Original Charger, HP EliteBook Keyboard"
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                    Specifications / Note (Optional)
                  </label>
                  <input
                    className="input"
                    value={customItemDesc}
                    onChange={(e) => setCustomItemDesc(e.target.value)}
                    placeholder="e.g. 65W Type-C Adapter / Brand New Sourced OEM"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 140px auto', gap: 12, alignItems: 'flex-end' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                    Quantity *
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    placeholder="Qty"
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                    Purchase Cost (PKR) *
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={customItemCost}
                    onChange={(e) => setCustomItemCost(e.target.value)}
                    placeholder="Cost paid (e.g. 1000)"
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, display: 'block' }}>
                    Customer Sale Price (PKR) *
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={customItemSalePrice}
                    onChange={(e) => setCustomItemSalePrice(e.target.value)}
                    placeholder="Billed price (e.g. 1200)"
                  />
                </div>

                <div style={{ paddingBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Gross Profit</span>
                  <strong style={{
                    fontSize: 13,
                    color: estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    PKR {estimatedProfit.toLocaleString('en-PK')}
                  </strong>
                </div>

                <button
                  type="button"
                  className="btn primary"
                  onClick={handleAddCustomItem}
                  style={{ height: '38px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  disabled={!customItemName.trim()}
                >
                  + Add Sourced Item
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

          {/* Cart Table */}
          <div className="span-12">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sourced Item</th>
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
                            <strong>{item.name}</strong>
                            <span className="badge info" style={{ fontSize: 9, padding: '2px 6px' }}>
                              ⚡ Sourced
                            </span>
                          </div>
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
                        No items added to invoice yet. Enter details above and click &ldquo;+ Add Sourced Item&rdquo;.
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
