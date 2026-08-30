'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';

export default function ExpenseModal({
  isOpen,
  onClose,
  expense = null,
  onSuccess
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');
  const [linkedTrackingId, setLinkedTrackingId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  useEffect(() => {
    if (isOpen) {
      api.get('/categories')
        .then(res => {
          if (res.success) {
            setCategories(res.data.expenseCategories || []);
            if (!expense && res.data.expenseCategories?.length > 0) {
              setCategory(res.data.expenseCategories[0].name || res.data.expenseCategories[0]);
            }
          }
        })
        .catch(console.error);

      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });

      if (expense) {
        setCategory(expense.category || '');
        setDescription(expense.description || '');
        setAmount(expense.amount || '');
        setPaymentMethod(expense.paymentMethod || 'Cash');
        setReferenceId(expense.referenceId || '');
        setLinkedTrackingId(expense.linkedTrackingId || '');
        setDate(expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      } else {
        setDescription('');
        setAmount('');
        setPaymentMethod('Cash');
        setReferenceId('');
        setLinkedTrackingId('');
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, expense]);

  const executeSaveExpense = async () => {
    const numAmt = parseFloat(amount);
    setSubmitting(true);
    try {
      const payload = {
        category,
        description: description.trim(),
        amount: numAmt,
        paymentMethod,
        referenceId: referenceId.trim(),
        linkedTrackingId: linkedTrackingId.trim(),
        date
      };

      let res;
      if (expense) {
        res = await api.put(`/expenses/${expense.id}`, payload);
      } else {
        res = await api.post('/expenses', payload);
      }

      if (res.success) {
        toast(`Expense ${expense ? 'updated' : 'recorded'} successfully!`);
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        notifyBalanceUpdated();
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error saving expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast('Valid expense amount is required', 'error');
      return;
    }
    if (!description.trim()) {
      toast('Expense description is required', 'error');
      return;
    }

    // Check Drawer Balance before payment outflow
    if (['Cash', 'Online'].includes(paymentMethod)) {
      let available = 0;
      let balCheckOk = false;
      try {
        const balRes = await api.get('/accounts/drawer-balance', { noCache: true });
        if (balRes.success && balRes.data) {
          available = paymentMethod === 'Cash' ? (balRes.data.cash ?? 0) : (balRes.data.online ?? 0);
          balCheckOk = true;
        }
      } catch (err) {
        // API failed — treat available as 0 to force user confirmation
        available = 0;
        balCheckOk = false;
      }
      if (!balCheckOk || numAmt > available + 0.005) {
        setBalanceWarningModal({
          isOpen: true,
          availableBalance: available,
          requiredAmount: numAmt,
          paymentMethod
        });
        return;
      }
    }

    await executeSaveExpense();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? "Edit Expense" : "Record Operating Expense"}
      subtitle="Shop utilities, supplies, courier and parts procurement"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="expenseForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Expense'}
          </button>
        </>
      }
    >
      <form id="expenseForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-6">
            <label>Expense Category *</label>
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id || c.name || c} value={c.name || c}>
                  {c.name || c}
                </option>
              ))}
            </select>
          </div>

          <div className="field span-6">
            <label>Expense Amount PKR *</label>
            <input
              className="input"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="field span-12">
            <label>Description / Item Details *</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electric bill, soldering wire, tea for shop"
              required
            />
          </div>

          <div className="field span-4">
            <label>Payment Method *</label>
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash (from Register)</option>
              <option value="Online">Online Bank Transfer</option>
            </select>
          </div>

          <div className="field span-4">
            <label>Reference / Receipt No.</label>
            <input
              className="input"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Slip / Trans ID"
            />
          </div>

          <div className="field span-4">
            <label>Expense Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field span-12">
            <label>Linked Repair Tracking ID (Optional)</label>
            <input
              className="input"
              value={linkedTrackingId}
              onChange={(e) => setLinkedTrackingId(e.target.value)}
              placeholder="e.g. RPR-00001 (if expense is specific to a job)"
            />
          </div>
        </div>
      </form>

      {/* Insufficient Drawer Balance Alert & Confirmation Modal */}
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeSaveExpense}
        paymentMethod={balanceWarningModal.paymentMethod}
        requiredAmount={balanceWarningModal.requiredAmount}
        availableBalance={balanceWarningModal.availableBalance}
        isSubmitting={submitting}
      />
    </Modal>
  );
}
