'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function AdjustSparePartStockModal({
  isOpen,
  onClose,
  part,
  onSuccess
}) {
  const { toast } = useToast();
  const [direction, setDirection] = useState('IN'); // 'IN' | 'OUT'
  const [quantity, setQuantity] = useState('1');
  const [reasonPreset, setReasonPreset] = useState('Vendor Purchase / Restock');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDirection('IN');
      setQuantity('1');
      setReasonPreset('Vendor Purchase / Restock');
      setCustomReason('');
    }
  }, [isOpen, part]);

  if (!isOpen || !part) return null;

  const currentStock = parseInt(part.currentStock ?? part.current_stock ?? 0, 10);
  const numQty = parseInt(quantity || 0, 10);
  const resultingStock = direction === 'IN' ? currentStock + numQty : Math.max(0, currentStock - numQty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(numQty) || numQty <= 0) {
      toast('Quantity must be greater than 0', 'error');
      return;
    }

    if (direction === 'OUT' && numQty > currentStock) {
      toast(`Cannot deduct ${numQty} units. Only ${currentStock} currently available in stock.`, 'error');
      return;
    }

    const finalReason = reasonPreset === 'Other' ? customReason.trim() : reasonPreset;
    if (!finalReason) {
      toast('Please provide a reason for stock adjustment', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patch(`/repair-parts/${part.id}/stock`, {
        direction,
        quantity: numQty,
        reason: finalReason
      });

      if (res.success) {
        toast(`Stock for "${part.name}" updated! New stock: ${resultingStock} units.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
        }
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Error updating stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Spare Part Stock"
      subtitle={`Update inventory stock level for ${part.code} — ${part.name}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="adjustPartStockForm"
            className={`btn ${direction === 'IN' ? 'primary' : 'danger'}`}
            disabled={submitting || numQty <= 0}
          >
            {submitting ? 'Updating...' : `Confirm ${direction === 'IN' ? '+ Stock IN' : '- Stock OUT'}`}
          </button>
        </>
      }
    >
      <form id="adjustPartStockForm" onSubmit={handleSubmit}>
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CURRENT ACTIVE STOCK</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: currentStock <= (part.minStockAlert || 2) ? '#dc2626' : '#16a34a' }}>
              {currentStock} units
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>RESULTING STOCK</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: resultingStock <= (part.minStockAlert || 2) ? '#dc2626' : '#2563eb' }}>
              {resultingStock} units
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="field span-6">
            <label>Adjustment Direction *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`btn ${direction === 'IN' ? 'primary' : 'soft'}`}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, padding: '7px' }}
                onClick={() => {
                  setDirection('IN');
                  setReasonPreset('Vendor Purchase / Restock');
                }}
              >
                <PlusCircle size={14} /> + Stock IN
              </button>
              <button
                type="button"
                className={`btn ${direction === 'OUT' ? 'danger' : 'soft'}`}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, padding: '7px' }}
                onClick={() => {
                  setDirection('OUT');
                  setReasonPreset('Defective / Damaged Part Discarded');
                }}
              >
                <MinusCircle size={14} /> - Stock OUT
              </button>
            </div>
          </div>

          <div className="field span-6">
            <label>Quantity *</label>
            <input
              type="number"
              className="input"
              min="1"
              max={direction === 'OUT' ? currentStock : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field span-12">
            <label>Reason *</label>
            <select
              className="select"
              value={reasonPreset}
              onChange={(e) => setReasonPreset(e.target.value)}
            >
              {direction === 'IN' ? (
                <>
                  <option value="Vendor Purchase / Restock">Vendor Purchase / Restock</option>
                  <option value="Vendor Warranty Replacement Received">Vendor Warranty Replacement Received</option>
                  <option value="Stock Audit Found Extra">Stock Audit Correction (Found Extra)</option>
                  <option value="Returned from Cancelled Job">Returned from Cancelled Job</option>
                  <option value="Other">Other Reason (Specify below)</option>
                </>
              ) : (
                <>
                  <option value="Defective / Damaged Part Discarded">Defective / Damaged Part Discarded</option>
                  <option value="Vendor Return / RMA Dispatched">Vendor Return / RMA Dispatched</option>
                  <option value="Stock Audit Loss / Breakage">Stock Audit Loss / Breakage</option>
                  <option value="Internal Workshop Testing Consumption">Internal Workshop Testing Consumption</option>
                  <option value="Other">Other Reason (Specify below)</option>
                </>
              )}
            </select>
          </div>

          {reasonPreset === 'Other' && (
            <div className="field span-12">
              <label>Custom Reason Details *</label>
              <input
                type="text"
                className="input"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Explain reason for adjustment..."
                required
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
