'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
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
  const [reason, setReason] = useState('Inventory recount / Audit correction');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDirection('IN');
      setQuantity(1);
      setReason('Inventory recount / Audit correction');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!product) return null;

  const currentStock = product.currentStock || 0;
  const numQty = parseInt(quantity || 0, 10);
  const newStock = direction === 'IN' ? currentStock + numQty : currentStock - numQty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numQty <= 0) {
      toast('Quantity must be greater than zero', 'error');
      return;
    }
    if (direction === 'OUT' && numQty > currentStock) {
      toast(`Cannot deduct more than current stock of ${currentStock}`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/products/${product.id}/adjust`, {
        direction,
        quantity: numQty,
        reason: reason.trim(),
        date
      });

      if (res.success) {
        toast(`Stock adjusted successfully! New stock: ${res.data.newStock}`);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error adjusting stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Stock Adjustment"
      subtitle={`${product.code} — ${product.brand} ${product.model || product.productName}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="stockAdjForm"
            className={`btn ${direction === 'IN' ? 'primary' : 'danger'}`}
            disabled={submitting || (direction === 'OUT' && numQty > currentStock)}
          >
            {submitting ? 'Saving...' : `Apply Adjustment (${direction === 'IN' ? `+${numQty}` : `-${numQty}`})`}
          </button>
        </>
      }
    >
      <form id="stockAdjForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-6">
            <label>Adjustment Type *</label>
            <select
              className="select"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="IN">Stock IN / Add Stock (+)</option>
              <option value="OUT">Stock OUT / Deduct Stock (-)</option>
            </select>
          </div>

          <div className="field span-6">
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

          <div className="field span-6">
            <label>Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field span-6">
            <label>Reason / Audit Note *</label>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count, damaged item"
              required
            />
          </div>

          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>Current Stock</span>
              <strong>{currentStock}</strong>
            </div>
            <div className="summary-row">
              <span>Adjustment</span>
              <strong style={{ color: direction === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                {direction === 'IN' ? `+${numQty}` : `-${numQty}`}
              </strong>
            </div>
            <div className="summary-row total">
              <span>Projected New Stock</span>
              <strong>{Math.max(0, newStock)}</strong>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
