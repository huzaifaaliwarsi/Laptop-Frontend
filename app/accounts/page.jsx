'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import RecordPaymentModal from '../../components/modules/accounts/RecordPaymentModal';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('Customer Receivable');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [loading, setLoading] = useState(true);

  const [paymentAccount, setPaymentAccount] = useState(null);

  const loadAccounts = () => {
    setLoading(true);
    let url = `/accounts?type=${encodeURIComponent(activeTab)}`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

    api.get(url)
      .then(res => {
        if (res.success) setAccounts(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccounts();
  }, [activeTab, statusFilter]);

  const totalOutstanding = accounts.filter(a => a.status === 'Open').reduce((s, a) => s + (a.remaining || 0), 0);

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div className="tabs">
              <button
                type="button"
                className={`tab ${activeTab === 'Customer Receivable' ? 'active' : ''}`}
                onClick={() => setActiveTab('Customer Receivable')}
              >
                Customer Receivables
              </button>
              <button
                type="button"
                className={`tab ${activeTab === 'Customer Payable' ? 'active' : ''}`}
                onClick={() => setActiveTab('Customer Payable')}
              >
                Customer Payables
              </button>
              <button
                type="button"
                className={`tab ${activeTab === 'Vendor Payable' ? 'active' : ''}`}
                onClick={() => setActiveTab('Vendor Payable')}
              >
                Vendor Payables
              </button>
              <button
                type="button"
                className={`tab ${activeTab === 'Vendor Receivable' ? 'active' : ''}`}
                onClick={() => setActiveTab('Vendor Receivable')}
              >
                Vendor Receivables
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="select"
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Open">Open Only</option>
                <option value="Settled">Settled Only</option>
                <option value="">All Statuses</option>
              </select>
              <div style={{ padding: '6px 12px', background: '#eff6ff', borderRadius: 8, fontWeight: 800, color: 'var(--navy)' }}>
                Total: {money(totalOutstanding)}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Party Name</th>
                  <th>Linked Invoice / Ref</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Original Amount</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Remaining</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      Loading accounts ledger...
                    </td>
                  </tr>
                ) : accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <tr key={acc.id}>
                      <td><strong>{acc.id}</strong></td>
                      <td><strong>{acc.partyName}</strong></td>
                      <td>{acc.invoiceNo || acc.invoiceId || '—'}</td>
                      <td>{fmtDate(acc.date)}</td>
                      <td style={{ textAlign: 'right' }}>{money(acc.amount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 850, color: acc.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {money(acc.remaining)}
                      </td>
                      <td>
                        <span className={`badge ${acc.status === 'Settled' ? 'success' : 'warning'}`}>
                          {acc.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <Link
                            href={`/ledger?partyType=${acc.partyType.toLowerCase()}&partyId=${acc.partyId}`}
                            className="btn small"
                          >
                            Ledger
                          </Link>
                          {acc.status === 'Open' && (
                            <button
                              type="button"
                              className="btn small primary"
                              onClick={() => setPaymentAccount(acc)}
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No {activeTab.toLowerCase()} entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RecordPaymentModal
        isOpen={!!paymentAccount}
        onClose={() => setPaymentAccount(null)}
        account={paymentAccount}
        onSuccess={() => loadAccounts()}
      />
    </>
  );
}
