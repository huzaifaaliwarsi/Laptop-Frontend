'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { AlertTriangle, ShieldAlert, Trash2, CheckCircle2, XCircle, ArrowRight, Lock } from 'lucide-react';

const REQUIRED_CONFIRM_TEXT = 'RESET-SYSTEM';

export default function ResetDatabaseModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [agreeCheck, setAgreeCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmInput('');
      setAgreeCheck(false);
      setSubmitting(false);
      setCountdown(3);
    }
  }, [isOpen]);

  // Countdown timer for step 3
  useEffect(() => {
    let timer;
    if (isOpen && step === 3 && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isOpen, step, countdown]);

  const handleExecuteReset = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/settings/reset-database');
      if (res.success) {
        toast('Database reset completed successfully.', 'success');
        onClose();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (err) {
      toast(err.message || 'Failed to reset database', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Factory Data Reset"
      subtitle={`Security Step ${step} of 3 • System Data Erasure`}
      wide={false}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          {step === 1 && (
            <button
              type="button"
              className="btn danger"
              onClick={() => setStep(2)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Continue to Step 2 <ArrowRight size={14} />
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              className="btn danger"
              disabled={confirmInput.trim() !== REQUIRED_CONFIRM_TEXT || !agreeCheck}
              onClick={() => {
                setCountdown(3);
                setStep(3);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Verify & Proceed <ArrowRight size={14} />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              className="btn danger"
              disabled={submitting || countdown > 0}
              onClick={handleExecuteReset}
              style={{ background: '#dc2626', color: '#ffffff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={15} />
              {submitting ? (
                'Erasing Data...'
              ) : countdown > 0 ? (
                `Confirming (${countdown}s)`
              ) : (
                'Permanently Reset Database'
              )}
            </button>
          )}
        </div>
      }
    >
      {/* STEP 1: INITIAL WARNING */}
      {step === 1 && (
        <div style={{ padding: '2px 0' }}>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#991b1b', fontSize: 13.5, fontWeight: 700 }}>
                Step 1: Permanent Data Erasure Warning
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7f1d1d' }}>
                This operation will clear all transactional and testing records from the database.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: '#fff1f2', padding: '12px', borderRadius: 8, border: '1px solid #ffe4e6' }}>
              <div style={{ color: '#be123c', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <XCircle size={14} /> To be Deleted
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#881337', lineHeight: 1.6 }}>
                <li>Sales & Purchases</li>
                <li>Repair Jobs & Tickets</li>
                <li>Ledgers & Payments</li>
                <li>Customer / Vendor Records</li>
                <li>Inventory Movements</li>
                <li>Expenses & Logs</li>
              </ul>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: 8, border: '1px solid #dcfce7' }}>
              <div style={{ color: '#15803d', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <CheckCircle2 size={14} /> Preserved
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#14532d', lineHeight: 1.6 }}>
                <li>Admin & Staff Logins</li>
                <li>Company Branding</li>
                <li>Categories & Services</li>
                <li>WhatsApp Settings</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SECURITY CODE */}
      {step === 2 && (
        <div style={{ padding: '2px 0' }}>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
              flexShrink: 0
            }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#92400e', fontSize: 13.5, fontWeight: 700 }}>
                Step 2: Security Verification
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>
                Type <code>{REQUIRED_CONFIRM_TEXT}</code> to unlock confirmation.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--navy)' }}>
              Verification Code:
            </label>
            <input
              type="text"
              className="input"
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textAlign: 'center',
                borderColor: confirmInput === REQUIRED_CONFIRM_TEXT ? '#22c55e' : '#cbd5e1',
                background: confirmInput === REQUIRED_CONFIRM_TEXT ? '#f0fdf4' : '#ffffff'
              }}
              placeholder={`Type "${REQUIRED_CONFIRM_TEXT}"`}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={agreeCheck}
              onChange={(e) => setAgreeCheck(e.target.checked)}
            />
            <span style={{ fontSize: 11.5, color: 'var(--text)' }}>
              I confirm the irreversible deletion of all transactional records.
            </span>
          </label>
        </div>
      )}

      {/* STEP 3: FINAL CONFIRMATION */}
      {step === 3 && (
        <div style={{ padding: '10px 0', textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Trash2 size={24} />
          </div>

          <h3 style={{ margin: '0 0 6px', color: '#991b1b', fontSize: 16, fontWeight: 700 }}>
            Step 3: Final Execution
          </h3>

          <p style={{ fontSize: 12.5, color: '#7f1d1d', maxWidth: 380, margin: '0 auto 14px', lineHeight: 1.4 }}>
            Clicking the button below will immediately wipe all invoices, repair tickets, inventory logs, and customer balances.
          </p>
        </div>
      )}
    </Modal>
  );
}
