'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { AlertCircle, Plus, Trash2, Wrench } from 'lucide-react';

export default function AddAdditionalWorkModal({
  isOpen,
  onClose,
  job,
  onSuccess
}) {
  const { toast } = useToast();
  const [faultFinding, setFaultFinding] = useState('');
  const [recommendedService, setRecommendedService] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [customerSafeNote, setCustomerSafeNote] = useState('');

  // Optional spare part
  const [catalogParts, setCatalogParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFaultFinding('');
      setRecommendedService('');
      setServiceCharge('');
      setCustomerSafeNote('');
      setSelectedPartId('');
      setPartQty(1);
      setPartPrice('');

      api.get('/repair-parts?status=Active').then(res => {
        if (res.success && Array.isArray(res.data)) {
          setCatalogParts(res.data);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  const handlePartSelect = (partId) => {
    setSelectedPartId(partId);
    if (!partId) {
      setPartPrice('');
      return;
    }
    const partObj = catalogParts.find(p => p.id === partId);
    if (partObj) {
      setPartPrice(partObj.sellingPrice || '');
      if (!recommendedService) {
        setRecommendedService(`Replace ${partObj.name}`);
      }
    }
  };

  const calcPartsTotal = () => {
    if (!selectedPartId) return 0;
    return parseFloat(partPrice || 0) * parseInt(partQty || 1, 10);
  };

  const calcGrandTotal = () => {
    const s = parseFloat(serviceCharge || 0);
    const p = calcPartsTotal();
    return s + p;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!faultFinding.trim()) {
      toast('Please enter the discovered fault finding details', 'error');
      return;
    }
    if (!recommendedService.trim()) {
      toast('Please enter the recommended service/repair', 'error');
      return;
    }

    const grandTotal = calcGrandTotal();
    if (grandTotal <= 0) {
      toast('Please specify a valid additional service charge or spare part price', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const partsPayload = [];
      if (selectedPartId) {
        const partObj = catalogParts.find(p => p.id === selectedPartId);
        partsPayload.push({
          partId: selectedPartId,
          partName: partObj?.name || 'Spare Part',
          quantity: parseInt(partQty || 1, 10),
          sellingPrice: parseFloat(partPrice || 0)
        });
      }

      const payload = {
        faultFinding: faultFinding.trim(),
        recommendedService: recommendedService.trim(),
        serviceCharge: parseFloat(serviceCharge || 0),
        partsCharge: calcPartsTotal(),
        totalQuotation: grandTotal,
        customerSafeNote: customerSafeNote.trim() || undefined,
        parts: partsPayload
      };

      const res = await api.post(`/repairs/${job.id}/additional-work`, payload);
      if (res.success) {
        toast('Additional work quotation created & sent to customer WhatsApp for approval!');
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Error submitting additional work request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Approval for Additional Fault"
      subtitle={`Service Job ${job?.tracking_id || ''} — Propose additional work requiring customer approval`}
      size="medium"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="addAdditionalWorkForm"
            className="btn primary"
            disabled={submitting}
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Wrench size={14} />
            {submitting ? 'Sending Request...' : 'Send WhatsApp Approval Request'}
          </button>
        </>
      }
    >
      <form id="addAdditionalWorkForm" onSubmit={handleSubmit}>
        <div style={{
          padding: '10px 14px',
          background: '#eff6ff',
          borderRadius: 8,
          border: '1px solid #bfdbfe',
          marginBottom: 14,
          fontSize: 12,
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <strong>Customer Approval Required:</strong> Charges and parts will NOT be applied to final invoice until customer approves via WhatsApp or authorized manual confirmation.
          </div>
        </div>

        <div className="form-grid">
          <div className="field span-12">
            <label>Discovered Fault / Finding *</label>
            <input
              className="input"
              value={faultFinding}
              onChange={(e) => setFaultFinding(e.target.value)}
              placeholder="e.g. Battery connector damaged, shorted mosfet found during service"
              required
            />
          </div>

          <div className="field span-12">
            <label>Recommended Additional Service / Solution *</label>
            <input
              className="input"
              value={recommendedService}
              onChange={(e) => setRecommendedService(e.target.value)}
              placeholder="e.g. Connector replacement & micro-soldering"
              required
            />
          </div>

          <div className="field span-6">
            <label>Additional Labor / Service Charge PKR</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              placeholder="e.g. 1500"
            />
          </div>

          <div className="field span-6">
            <label>Select Optional Spare Part</label>
            <select
              className="select"
              value={selectedPartId}
              onChange={(e) => handlePartSelect(e.target.value)}
            >
              <option value="">No replacement part needed</option>
              {catalogParts.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.code} — {p.name} (PKR {p.sellingPrice})
                </option>
              ))}
            </select>
          </div>

          {selectedPartId && (
            <>
              <div className="field span-6">
                <label>Part Selling Price PKR</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={partPrice}
                  onChange={(e) => setPartPrice(e.target.value)}
                />
              </div>

              <div className="field span-6">
                <label>Part Quantity</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="field span-12">
            <label>Customer-Safe Note (Included in WhatsApp message)</label>
            <input
              className="input"
              value={customerSafeNote}
              onChange={(e) => setCustomerSafeNote(e.target.value)}
              placeholder="e.g. Discovered while servicing cooling system. Recommended for long term stability."
            />
          </div>

          <div className="span-12" style={{
            marginTop: 8,
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Additional Quote
              </span>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Service: PKR {parseFloat(serviceCharge || 0).toLocaleString('en-PK')} + Parts: PKR {calcPartsTotal().toLocaleString('en-PK')}
              </div>
            </div>
            <strong style={{ fontSize: 18, color: '#1e40af', fontWeight: 800 }}>
              PKR {calcGrandTotal().toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}
