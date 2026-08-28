'use client';

import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function WhatsappSimulatorModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('Salam, I want to check laptops available');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      toast('Name and contact number are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/whatsapp/conversations/simulate', {
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim()
      });

      if (res.success) {
        toast('Simulated customer conversation opened!');
        onClose();
        if (onSuccess) onSuccess(res.data.conversationId);
      }
    } catch (err) {
      toast(err.message || 'Error simulating message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Simulate WhatsApp Customer"
      subtitle="Test the automated bot response and menu navigation"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="waSimForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Connecting...' : 'Start Simulation'}
          </button>
        </>
      }
    >
      <form id="waSimForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-6">
            <label>Customer Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tariq Khan"
              required
            />
          </div>

          <div className="field span-6">
            <label>Customer WhatsApp Number *</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="03001234567"
              required
            />
          </div>

          <div className="field span-12">
            <label>Initial Message *</label>
            <textarea
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Salam, 1, or RPR-00001"
              required
            />
          </div>

          <div className="span-12 callout">
            <strong>Bot Test Commands:</strong>
            <br />
            • <code>Salam</code> or <code>Hello</code>: Main options menu
            <br />
            • <code>1</code>: View available laptops from live inventory
            <br />
            • <code>2</code>: Inquire about laptop repair service
            <br />
            • <code>3</code> or <code>RPR-00001</code>: Real-time repair status lookup
            <br />
            • <code>4</code>: Quotation budget finder
            <br />
            • <code>6</code>: Request human staff handoff
          </div>
        </div>
      </form>
    </Modal>
  );
}
