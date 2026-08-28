'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function RepairServiceModal({
  isOpen,
  onClose,
  service = null,
  onSuccess
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('repair');
  const [charges, setCharges] = useState('');
  const [duration, setDuration] = useState('');
  const [conditions, setConditions] = useState('');
  const [status, setStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (service) {
        setName(service.name || '');
        setServiceType(service.serviceType || 'repair');
        setCharges(service.charges || '');
        setDuration(service.duration || '');
        setConditions(service.conditions || '');
        setStatus(service.status || 'Active');
      } else {
        setName('');
        setServiceType('repair');
        setCharges('');
        setDuration('1-2 Hours');
        setConditions('');
        setStatus('Active');
      }
    }
  }, [isOpen, service]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || charges === '') {
      toast('Service name and charges are required', 'error');
      return;
    }

    const cost = parseFloat(charges);
    if (isNaN(cost) || cost < 0) {
      toast('Valid charges amount is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        serviceType,
        charges: cost,
        duration: duration.trim(),
        conditions: conditions.trim(),
        status
      };

      let res;
      if (service) {
        res = await api.put(`/repair-services/${service.id}`, payload);
      } else {
        res = await api.post('/repair-services', payload);
      }

      if (res.success) {
        toast(`Repair service ${service ? 'updated' : 'created'} successfully!`);
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error saving repair service', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={service ? "Edit Repair Service" : "Add Master Repair Service"}
      subtitle="Standardized repair services and charges catalog"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="repairServiceForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Service'}
          </button>
        </>
      }
    >
      <form id="repairServiceForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-6">
            <label>Service Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Screen Replacement, Motherboard Repair"
              required
            />
          </div>

          <div className="field span-6">
            <label>Catalog Service Type *</label>
            <select
              className="select"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="repair">Repair Service (Direct Repair Work)</option>
              <option value="diagnosis">Diagnosis / Inspection Service</option>
            </select>
          </div>

          <div className="field span-4">
            <label>Standard Charges PKR *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="field span-4">
            <label>Estimated Duration</label>
            <input
              className="input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1-2 Hours, Same Day, 2 Days"
            />
          </div>

          <div className="field span-4">
            <label>Status</label>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="field span-12">
            <label>Terms / Conditions</label>
            <input
              className="input"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Optional warranty terms or preconditions"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
