'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import RecordPaymentModal from '../../components/modules/accounts/RecordPaymentModal';
import ProgressLoader from '../../components/common/ProgressLoader';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function LedgerPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('partyType') || 'customer';
  const initialId = searchParams.get('partyId') || '';

  const [partyType, setPartyType] = useState(initialType);
  const [partyList, setPartyList] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(initialId);
  const [ledgerData, setLedgerData] = useState(null);
  const [viewMode, setViewMode] = useState('bills'); // 'bills' | 'log'
  const [loading, setLoading] = useState(false);

  const [paymentAccount, setPaymentAccount] = useState(null);
  const [expandedBills, setExpandedBills] = useState({});

  // Load parties list
  useEffect(() => {
    const endpoint = partyType === 'vendor' ? '/vendors' : '/customers';
    api.get(endpoint).then(res => {
      if (res.success) {
        const list = res.data || [];
        setPartyList(list);
        if (!selectedPartyId && list.length > 0) {
          setSelectedPartyId(list[0].id);
        }
      }
    }).catch(console.error);
  }, [partyType]);

  // Load Ledger
  const loadLedger = () => {
    if (!selectedPartyId) return;
    setLoading(true);
    api.get(`/ledger/party/${partyType}/${selectedPartyId}`)
      .then(res => {
        if (res.success) setLedgerData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLedger();
  }, [partyType, selectedPartyId]);

  const toggleBill = (id) => {
    setExpandedBills(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isVendor = partyType === 'vendor';
  const summary = ledgerData?.summary || {};
  const party = ledgerData?.party || {};
  const groupedBills = ledgerData?.groupedBills || [];
  const transactionLog = ledgerData?.transactionLog || [];

  return (
    <>
      {/* Top Selector & Controls */}
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="tabs">
                <button
                  type="button"
                  className={`tab ${partyType === 'customer' ? 'active' : ''}`}
                  onClick={() => {
                    setPartyType('customer');
                    setSelectedPartyId('');
                    setLedgerData(null);
                  }}
                >
                  Customer Ledger
                </button>
                <button
                  type="button"
                  className={`tab ${partyType === 'vendor' ? 'active' : ''}`}
                  onClick={() => {
                    setPartyType('vendor');
                    setSelectedPartyId('');
                    setLedgerData(null);
                  }}
                >
                  Vendor Ledger
                </button>
              </div>

              <select
                className="select"
                style={{ minWidth: 280 }}
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
              >
                <option value="">Select {isVendor ? 'Vendor' : 'Customer'} Account</option>
                {partyList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.contact || p.id})</option>
                ))}
              </select>
            </div>

            {party?.name && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                Viewing Statement for: <strong style={{ color: 'var(--navy)' }}>{party.name}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 20 }}>
          <ProgressLoader message="Please wait while party ledger records are loading..." />
        </div>
      ) : ledgerData ? (
        <>
          {/* 1. Top Dark Summary Header Band */}
          <div style={{
            backgroundColor: '#2d3748',
            borderRadius: 14,
            padding: '24px 36px',
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
          }}>
            {/* Left */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                {isVendor ? 'TOTAL PURCHASES' : 'TOTAL SALES'}
              </span>
              <strong style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', display: 'block', marginTop: 4 }}>
                {money(isVendor ? summary.totalPurchases : summary.totalSales)}
              </strong>
            </div>

            {/* Center */}
            <div style={{ textAlign: 'center', minWidth: 240 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', display: 'block' }}>
                Current Balance
              </span>
              <strong style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', display: 'block', marginTop: 2 }}>
                {money(Math.abs(summary.netBalance || 0))}
              </strong>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 14px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#f1f5f9',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  {summary.netBalanceLabel || 'Settled'}
                </span>
              </div>
            </div>

            {/* Right */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                {isVendor ? 'PAYMENTS MADE TO VENDOR' : 'PAYMENTS RECEIVED'}
              </span>
              <strong style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', display: 'block', marginTop: 4 }}>
                {money(isVendor ? summary.paymentsMade : summary.receivedFromParty)}
              </strong>
            </div>
          </div>

          {/* 2. Middle 4-Box Grid (2 rows of 2 columns) */}
          <div className="grid cols-2" style={{ marginTop: 12, gap: 12 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                {isVendor ? 'Open Vendor Payable' : 'Open Customer Receivable'}
              </span>
              <strong style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                {money(isVendor ? summary.openPayable : summary.openReceivable)}
              </strong>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                {isVendor ? 'Open Vendor Receivable' : 'Open Customer Payable'}
              </span>
              <strong style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                {money(isVendor ? summary.openReceivable : summary.openPayable)}
              </strong>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                {isVendor ? 'Total Return / Credit' : 'Total Buybacks / Credits'}
              </span>
              <strong style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                {money(isVendor ? summary.totalReturns : summary.totalCustomerCredits)}
              </strong>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                {isVendor ? 'Received from Vendor' : 'Refunds / Paid to Customer'}
              </span>
              <strong style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                {money(isVendor ? summary.receivedFromParty : summary.paymentsMade)}
              </strong>
            </div>
          </div>

          {/* 3. Centered View Switcher Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setViewMode('bills')}
              style={{
                padding: '9px 28px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: viewMode === 'bills' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: viewMode === 'bills' ? '#2563eb' : '#ffffff',
                color: viewMode === 'bills' ? '#ffffff' : '#334155',
                boxShadow: viewMode === 'bills' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              Grouped Bills
            </button>
            <button
              type="button"
              onClick={() => setViewMode('log')}
              style={{
                padding: '9px 28px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: viewMode === 'log' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: viewMode === 'log' ? '#2563eb' : '#ffffff',
                color: viewMode === 'log' ? '#ffffff' : '#334155',
                boxShadow: viewMode === 'log' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              Transaction Log
            </button>
          </div>

          {/* View Mode 1: Grouped Bills */}
          {viewMode === 'bills' && (
            <div className="ledger-bills" style={{ padding: 0, marginTop: 10 }}>
              {groupedBills.length > 0 ? (
                groupedBills.map((bill) => {
                  const isOpen = !!expandedBills[bill.id];
                  const hasRemaining = bill.remaining > 0.005;

                  return (
                    <div
                      key={bill.id}
                      className={`ledger-bill-card ${isOpen ? 'open' : ''}`}
                    >
                      <div className="ledger-bill-head" onClick={() => toggleBill(bill.id)}>
                        <div>
                          <h4>{bill.invoiceNo} · {bill.type}</h4>
                          <p>
                            Date: {fmtDate(bill.date)} · Total: <b>{money(bill.total)}</b> · Paid: <b>{money(bill.paidToDate || bill.actualMoneyReceived || 0)}</b>
                          </p>
                        </div>
                        <div className="ledger-bill-actions">
                          <span className={`ledger-status ${bill.status}`}>
                            {bill.status.toUpperCase()} (Due: {money(bill.remaining)})
                          </span>
                          {hasRemaining && bill.accountId && (
                            <button
                              type="button"
                              className="btn small primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentAccount({
                                  id: bill.accountId,
                                  type: isVendor ? 'Vendor Payable' : 'Customer Receivable',
                                  partyName: party.name,
                                  invoiceNo: bill.invoiceNo,
                                  amount: bill.total,
                                  remaining: bill.remaining
                                });
                              }}
                            >
                              Pay Installment
                            </button>
                          )}
                          <span className="ledger-bill-toggle">▾</span>
                        </div>
                      </div>

                      <div className="ledger-bill-details">
                        <div className="ledger-bill-body">
                          <div className="ledger-bill-summary">
                            <div className="ledger-bill-row total">
                              <span>Total Bill Amount</span>
                              <strong>{money(bill.total)}</strong>
                            </div>
                            <div className="ledger-bill-row">
                              <span>Initial Payment</span>
                              <strong>{money(bill.initialPaid)}</strong>
                            </div>
                            <div className="ledger-bill-row">
                              <span>Subsequent Installments</span>
                              <strong>{money((bill.paidToDate || 0) - (bill.initialPaid || 0))}</strong>
                            </div>
                            <div className="ledger-bill-row remaining">
                              <span>Outstanding Balance Due</span>
                              <strong style={{ color: hasRemaining ? 'var(--danger)' : 'var(--success)' }}>
                                {money(bill.remaining)}
                              </strong>
                            </div>
                          </div>

                          <div className="ledger-payments">
                            <h5>Payment Installments Breakdown</h5>
                            {bill.installments && bill.installments.length > 0 ? (
                              <div className="ledger-installments">
                                {bill.installments.map((inst, i) => (
                                  <div key={i} className="ledger-installment">
                                    <div>
                                      <strong>{inst.type} via {inst.method}</strong>
                                      <small>
                                        {fmtDate(inst.date)}{inst.reference ? ` · Ref: ${inst.reference}` : ''}{inst.notes ? ` · ${inst.notes}` : ''}
                                      </small>
                                    </div>
                                    <div className="ledger-installment-amount">
                                      {money(inst.amount)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="ledger-no-payment">
                                No payments recorded yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 10 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 12px',
                    fontSize: 20,
                    fontWeight: 800
                  }}>
                    —
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
                    No bills available
                  </h4>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Invoices and vendor-return credits for this party will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* View Mode 2: Chronological Transaction Log */}
          {viewMode === 'log' && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="panel-head">
                <h3>Chronological Transaction Log & Running Balance</h3>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Description / Details</th>
                        <th style={{ textAlign: 'right' }}>Bill Amount</th>
                        <th style={{ textAlign: 'right' }}>Paid</th>
                        <th style={{ textAlign: 'right' }}>Received</th>
                        <th style={{ textAlign: 'right' }}>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionLog.length > 0 ? (
                        transactionLog.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{fmtDate(entry.date)}</td>
                            <td><strong>{entry.reference || '—'}</strong></td>
                            <td>{entry.description}</td>
                            <td style={{ textAlign: 'right' }}>{entry.billAmount ? money(entry.billAmount) : '—'}</td>
                            <td style={{ textAlign: 'right', color: entry.paid > 0 ? 'var(--danger)' : 'inherit' }}>
                              {entry.paid > 0 ? money(entry.paid) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', color: entry.received > 0 ? 'var(--success)' : 'inherit' }}>
                              {entry.received > 0 ? money(entry.received) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 850, color: entry.running > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              {money(entry.running)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>
                            No chronological entries logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', marginTop: 14 }}>
          Please select a customer or vendor account above to view their financial ledger.
        </div>
      )}

      <RecordPaymentModal
        isOpen={!!paymentAccount}
        onClose={() => setPaymentAccount(null)}
        account={paymentAccount}
        onSuccess={() => loadLedger()}
      />
    </>
  );
}
