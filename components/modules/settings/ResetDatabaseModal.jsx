'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { AlertTriangle, Trash2 } from 'lucide-react';

const REQUIRED_CONFIRM_TEXT = 'RESET';

export default function ResetDatabaseModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [confirmInput, setConfirmInput] = useState('');
  const [agreeCheck, setAgreeCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setAgreeCheck(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleExecuteReset = async () => {
    if (confirmInput.trim() !== REQUIRED_CONFIRM_TEXT || !agreeCheck) return;

    setSubmitting(true);
    try {
      const res = await api.post('/settings/reset-database');
      if (res.success) {
        toast('Database reset completed successfully.', 'success');
        onClose();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      }
    } catch (err) {
      toast(err.message || 'Failed to reset database', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isConfirmed = confirmInput.trim() === REQUIRED_CONFIRM_TEXT && agreeCheck;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Factory Data Reset"
      subtitle="Permanently clear transaction history and test records"
      wide={false}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={submitting}
            style={{ fontSize: 12 }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn danger"
            disabled={!isConfirmed || submitting}
            onClick={handleExecuteReset}
            style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={14} />
            {submitting ? 'Resetting Database...' : 'Permanently Reset Database'}
          </button>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>
        {/* Warning Callout */}
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
            <strong>Warning:</strong> This action cannot be undone. All sales, purchase invoices, repair jobs, expenses, and ledger payments will be permanently deleted. Staff logins and shop settings will be preserved.
          </div>
        </div>

        {/* Verification Input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 5, color: '#334155' }}>
            Type <strong style={{ color: '#dc2626' }}>RESET</strong> to confirm:
          </label>
          <input
            type="text"
            className="input"
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textAlign: 'center',
              height: 34,
              borderColor: confirmInput === REQUIRED_CONFIRM_TEXT ? '#22c55e' : '#cbd5e1',
              background: confirmInput === REQUIRED_CONFIRM_TEXT ? '#f0fdf4' : '#ffffff'
            }}
            placeholder="Type RESET"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
            autoFocus
          />
        </div>

        {/* Agreement Checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          padding: '8px 10px',
          background: '#f8fafc',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={agreeCheck}
            onChange={(e) => setAgreeCheck(e.target.checked)}
          />
          <span style={{ fontSize: 11.5, color: '#475569' }}>
            I understand that this action is permanent and irreversible.
          </span>
        </label>
      </div>
    </Modal>
  );
}
