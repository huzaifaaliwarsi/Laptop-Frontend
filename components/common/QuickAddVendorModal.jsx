'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useToast } from './Toast';
import api from '../../services/api';

export default function QuickAddVendorModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReset = () => {
    setName('');
    setContact('');
    setAddress('');
    setNotes('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Vendor / Supplier name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        address: address.trim(),
        notes: notes.trim()
      };

      const res = await api.post('/vendors', payload);
      if (res.success) {
        toast(`Supplier "${res.data.name}" added successfully!`);
        handleReset();
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Error creating supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Supplier / Vendor"
      subtitle="Quickly register a new supplier and auto-select for this product"
      footer={
        <>
          <button type="button" className="btn" onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="quickAddVendorForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving Supplier...' : 'Save & Select Supplier'}
          </button>
        </>
      }
    >
      <form id="quickAddVendorForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-12">
            <label>Supplier / Vendor Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Al-Rehman Computers, Hafeez Centre"
              required
              autoFocus
            />
          </div>

          <div className="field span-6">
            <label>Contact / Phone Number</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. 0300-1234567"
            />
          </div>

          <div className="field span-6">
            <label>Shop / City Address</label>
            <input
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop #12, Ground Floor"
            />
          </div>

          <div className="field span-12">
            <label>Notes / Terms (Optional)</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 7 days checking warranty, payment on delivery"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
