'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Landmark, RefreshCw, Loader2, ArrowDownLeft, ArrowUpRight, PlusCircle, MinusCircle, History, CheckCircle2 } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';

export default function CashDrawerModal({
  isOpen,
  onClose,
  defaultAction = 'Deposit', // 'Deposit' | 'Withdrawal'
  defaultMethod = 'Cash' // 'Cash' | 'Online'
}) {
  const { toast } = useToast();

  const [liveCash, setLiveCash] = useState(0);
  const [liveOnline, setLiveOnline] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [drawerAction, setDrawerAction] = useState(defaultAction);
  const [drawerMethod, setDrawerMethod] = useState(defaultMethod);
  const [drawerAmount, setDrawerAmount] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // Audit trail
  const [drawerTransactions, setDrawerTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const loadBalances = useCallback(async (showToast = false) => {
    setRefreshing(true);
    try {
      const res = await api.get('/accounts/drawer-balance', { noCache: true });
      if (res.success && res.data) {
        setLiveCash(parseFloat(res.data.cash || 0));
        setLiveOnline(parseFloat(res.data.online || 0));
        if (showToast) toast('Cash drawer balances updated!');
      }
    } catch (err) {
      console.error('Error fetching drawer balance:', err);
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  const loadTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      const res = await api.get('/accounts/drawer-transactions');
      if (res.success && res.data) {
        setDrawerTransactions(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching drawer history:', err);
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDrawerAction(defaultAction);
      setDrawerMethod(defaultMethod);
      setDrawerAmount('');
      setDrawerNotes('');
      loadBalances();
      loadTransactions();
    }
  }, [isOpen, defaultAction, defaultMethod, loadBalances, loadTransactions]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(drawerAmount);
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    if (drawerAction === 'Withdrawal') {
      const currentBal = drawerMethod === 'Cash' ? liveCash : liveOnline;
      if (amt > currentBal + 0.005) {
        toast(`Insufficient balance in ${drawerMethod}. Current available: PKR ${currentBal.toLocaleString('en-PK')}`, 'warning');
      }
    }

    setSavingAction(true);
    try {
      const res = await api.post('/accounts/drawer-transaction', {
        type: drawerAction,
        method: drawerMethod,
        amount: amt,
        notes: drawerNotes.trim() || `${drawerAction === 'Deposit' ? 'Counter Cash Top-up' : 'Cash Withdrawal'}`
      });

      if (res.success) {
        toast(`${drawerAction === 'Deposit' ? 'Deposit successful' : 'Withdrawal recorded'}! PKR ${amt.toLocaleString('en-PK')} ${drawerAction === 'Deposit' ? 'added to' : 'deducted from'} ${drawerMethod}.`);
        setDrawerAmount('');
        setDrawerNotes('');
        notifyBalanceUpdated();
        await loadBalances();
        await loadTransactions();
      }
    } catch (err) {
      toast(err.message || 'Error processing drawer transaction', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Drawer & Counter Top-up"
      subtitle="Add cash float, record top-ups, or withdraw funds with real-time balance tracking"
      wide={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 1. Live Balances Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1.5px solid #86efac',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#16a34a', color: '#fff', borderRadius: 8, padding: 8, display: 'flex' }}>
                <Wallet size={18} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Live Cash in Drawer
                </div>
                {refreshing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, color: '#166534', fontSize: 12 }}>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 800, color: liveCash < 0 ? '#dc2626' : '#15803d', marginTop: 2 }} className="font-mono">
                    PKR {liveCash.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #93c5fd',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#2563eb', color: '#fff', borderRadius: 8, padding: 8, display: 'flex' }}>
                <Landmark size={18} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Live Bank / Online
                </div>
                {refreshing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, color: '#1e40af', fontSize: 12 }}>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 800, color: liveOnline < 0 ? '#dc2626' : '#1d4ed8', marginTop: 2 }} className="font-mono">
                    PKR {liveOnline.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn small soft"
              style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => loadBalances(true)}
              disabled={refreshing}
              title="Refresh balances"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 2. Direct Deposit / Top-up Form */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              {drawerAction === 'Deposit' ? (
                <>
                  <ArrowDownLeft size={16} className="text-emerald-600" />
                  <span>+ Add Cash / Top-up Counter</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={16} className="text-rose-600" />
                  <span>- Withdraw Funds from Counter</span>
                </>
              )}
            </span>

            {/* Toggle Mode */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: drawerAction === 'Deposit' ? '#16a34a' : 'transparent',
                  color: drawerAction === 'Deposit' ? '#fff' : '#475569',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
                onClick={() => setDrawerAction('Deposit')}
              >
                <PlusCircle size={13} /> + Deposit
              </button>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: drawerAction === 'Withdrawal' ? '#dc2626' : 'transparent',
                  color: drawerAction === 'Withdrawal' ? '#fff' : '#475569',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
                onClick={() => setDrawerAction('Withdrawal')}
              >
                <MinusCircle size={13} /> - Withdraw
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Target Account <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="input"
                  value={drawerMethod}
                  onChange={(e) => setDrawerMethod(e.target.value)}
                  style={{ height: 36, fontSize: 13, padding: '4px 10px' }}
                >
                  <option value="Cash">Cash in Drawer (Physical Counter)</option>
                  <option value="Online">Bank / Online Account</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Amount (PKR) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={drawerAmount}
                  onChange={(e) => setDrawerAmount(e.target.value)}
                  style={{ height: 36, fontSize: 13, fontWeight: 700, padding: '4px 10px' }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Reason / Note <span style={{ fontSize: 10.5, fontWeight: 400, color: '#94a3b8' }}>(Optional)</span>
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder={drawerAction === 'Deposit' ? 'e.g. Opening Float, Cash Added for Customer Refunds, Owner Top-up' : 'e.g. Owner Cash Withdrawal, Bank Deposit'}
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  style={{ height: 36, fontSize: 12.5, padding: '4px 10px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={onClose}
                  disabled={savingAction}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className={`btn ${drawerAction === 'Deposit' ? 'success' : 'danger'}`}
                  disabled={savingAction || !drawerAmount}
                  style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {savingAction ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : drawerAction === 'Deposit' ? (
                    <>
                      <PlusCircle size={15} />
                      <span>Add PKR {drawerAmount ? parseFloat(drawerAmount).toLocaleString('en-PK') : '0'} to {drawerMethod}</span>
                    </>
                  ) : (
                    <>
                      <MinusCircle size={15} />
                      <span>Withdraw PKR {drawerAmount ? parseFloat(drawerAmount).toLocaleString('en-PK') : '0'} from {drawerMethod}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 3. Recent Drawer Top-ups Audit Trail */}
        {drawerTransactions && drawerTransactions.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <History size={13} />
              <span>Recent Cash Drawer Top-ups & Withdrawals</span>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontSize: 11 }}>Date</th>
                    <th style={{ padding: '8px 10px', fontSize: 11 }}>Type</th>
                    <th style={{ padding: '8px 10px', fontSize: 11 }}>Note / Reason</th>
                    <th style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {drawerTransactions.slice(0, 10).map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ padding: '7px 10px', color: '#64748b', fontSize: 11 }}>
                        {new Date(tx.date || tx.createdAt).toLocaleDateString('en-PK', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: tx.direction === 'Received' ? '#dcfce7' : '#fee2e2',
                          color: tx.direction === 'Received' ? '#166534' : '#991b1b'
                        }}>
                          {tx.direction === 'Received' ? '+ Cash In' : '- Cash Out'} ({tx.paymentMethod})
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#334155' }}>
                        {tx.notes || 'Drawer Adjustment'}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: tx.direction === 'Received' ? '#16a34a' : '#dc2626' }} className="font-mono">
                        PKR {tx.amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
