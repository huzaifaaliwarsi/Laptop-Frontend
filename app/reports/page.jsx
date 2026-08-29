'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import ProgressLoader from '../../components/common/ProgressLoader';
import { useAuth } from '../../context/AuthContext';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function ReportsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [activeReport, setActiveReport] = useState('sales'); // 'sales' | 'purchases' | 'pnl' | 'repairs'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [pnlData, setPnlData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = () => {
    setLoading(true);
    let url = `/reports/${activeReport === 'pnl' ? 'profit-loss' : activeReport}?`;
    if (fromDate) url += `from=${encodeURIComponent(fromDate)}&`;
    if (toDate) url += `to=${encodeURIComponent(toDate)}&`;

    api.get(url)
      .then(res => {
        if (res.success) {
          if (activeReport === 'pnl') {
            setPnlData(res.data);
            setReportData([]);
          } else {
            setReportData(res.data || []);
            setPnlData(null);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, [activeReport, fromDate, toDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div className="tabs">
              <button
                type="button"
                className={`tab ${activeReport === 'sales' ? 'active' : ''}`}
                onClick={() => setActiveReport('sales')}
              >
                Sales Report
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className={`tab ${activeReport === 'purchases' ? 'active' : ''}`}
                  onClick={() => setActiveReport('purchases')}
                >
                  Purchases Report
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className={`tab ${activeReport === 'pnl' ? 'active' : ''}`}
                  onClick={() => setActiveReport('pnl')}
                >
                  Profit & Loss Statement
                </button>
              )}
              <button
                type="button"
                className={`tab ${activeReport === 'repairs' ? 'active' : ''}`}
                onClick={() => setActiveReport('repairs')}
              >
                Repairs Report
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                style={{ width: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
              />
              <input
                className="input"
                type="date"
                style={{ width: 140 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
              />
              <button type="button" className="btn" onClick={handlePrint}>
                <Icon name="printer" /> Print Report
              </button>
            </div>
          </div>
        </div>

        {/* Profit & Loss Report View */}
        {activeReport === 'pnl' && pnlData && (
          <div className="panel-body">
            <div className="report-kpi-grid">
              <div className="report-kpi">
                <span>TOTAL REVENUE</span>
                <strong>{money(pnlData.totalRevenue)}</strong>
                <small>Retail Sales + Repairs + Services</small>
              </div>

              <div className="report-kpi">
                <span>TOTAL COST OF GOODS (COGS)</span>
                <strong style={{ color: 'var(--danger)' }}>{money(pnlData.totalCogs)}</strong>
                <small>Product cost snapshots & repair parts</small>
              </div>

              <div className="report-kpi">
                <span>GROSS PROFIT</span>
                <strong style={{ color: pnlData.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {money(pnlData.grossProfit)}
                </strong>
                <small>Revenue minus Cost of Goods</small>
              </div>

              <div className="report-kpi">
                <span>NET PROFIT (BOTTOM LINE)</span>
                <strong style={{ color: pnlData.netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 24 }}>
                  {money(pnlData.netProfit)}
                </strong>
                <small>Gross profit minus operating expenses</small>
              </div>
            </div>

            <div className="grid cols-2" style={{ marginTop: 16 }}>
              <div className="summary-box">
                <div className="line-card-head">
                  <strong>Revenue Breakdown</strong>
                </div>
                <div className="summary-row">
                  <span>Gross Retail Product Sales</span>
                  <strong>{money(pnlData.grossProductSales)}</strong>
                </div>
                <div className="summary-row" style={{ color: 'var(--danger)' }}>
                  <span>Less: Voided / Returned Sales</span>
                  <strong>-{money(pnlData.voidedProductSales)}</strong>
                </div>
                <div className="summary-row">
                  <span>Net Retail Product Sales</span>
                  <strong>{money(pnlData.netProductSales)}</strong>
                </div>
                <div className="summary-row">
                  <span>Service & Installation Revenue</span>
                  <strong>{money(pnlData.serviceSales)}</strong>
                </div>
                <div className="summary-row">
                  <span>Repair Workshop Revenue</span>
                  <strong>{money(pnlData.repairRevenue)}</strong>
                </div>
                <div className="summary-row">
                  <span>Exchange Difference Income</span>
                  <strong>{money(pnlData.exchangeIncome)}</strong>
                </div>
                <div className="summary-row total">
                  <span>Total Net Operating Revenue</span>
                  <strong>{money(pnlData.totalRevenue)}</strong>
                </div>
              </div>

              <div className="summary-box">
                <div className="line-card-head">
                  <strong>Costs & Operating Expenses</strong>
                </div>
                <div className="summary-row">
                  <span>Retail Inventory COGS</span>
                  <strong>{money(pnlData.retailCogs)}</strong>
                </div>
                <div className="summary-row">
                  <span>Repair Replacement Parts COGS</span>
                  <strong>{money(pnlData.repairPartsCogs)}</strong>
                </div>
                <div className="summary-row">
                  <span>Exchange Payout Cost</span>
                  <strong>{money(pnlData.exchangeCost)}</strong>
                </div>
                <div className="summary-row" style={{ fontWeight: 800 }}>
                  <span>Total Cost of Goods Sold (COGS)</span>
                  <strong>{money(pnlData.totalCogs)}</strong>
                </div>
                <div className="summary-row" style={{ color: 'var(--danger)' }}>
                  <span>Operating Expenses (Shop Utilities, Tea, Rent)</span>
                  <strong>{money(pnlData.operatingExpenses)}</strong>
                </div>
                <div className="summary-row total" style={{ color: pnlData.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  <span>Net Net Profit / (Loss)</span>
                  <strong>{money(pnlData.netProfit)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabular Reports (Sales, Purchases, Repairs) */}
        {activeReport !== 'pnl' && (
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  {activeReport === 'sales' && (
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Customer Name</th>
                      <th>Payment Method</th>
                      <th style={{ textAlign: 'right' }}>Product Total</th>
                      <th style={{ textAlign: 'right' }}>Service Total</th>
                      {isAdmin && <th style={{ textAlign: 'right' }}>COGS</th>}
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th>Status</th>
                      <th>Sold By</th>
                    </tr>
                  )}
                  {activeReport === 'purchases' && (
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Party Name</th>
                      <th>Payment Method</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th>Status</th>
                      <th>Recorded By</th>
                    </tr>
                  )}
                  {activeReport === 'repairs' && (
                    <tr>
                      <th>Tracking ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Job Type</th>
                      <th>Technician</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total Bill</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Remaining</th>
                      <th>Expected Date</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? (
                    <ProgressLoader tableRow colSpan={11} message="Please wait while report data is generating..." />
                  ) : reportData.length > 0 ? (
                    reportData.map((row, idx) => (
                      <tr key={row.id || idx}>
                        {activeReport === 'sales' && (
                          <>
                            <td><strong>{row.invoiceNo}</strong></td>
                            <td>{fmtDate(row.date)}</td>
                            <td><strong>{row.customerName}</strong></td>
                            <td>{row.paymentMethod}</td>
                            <td style={{ textAlign: 'right' }}>{money(row.productTotal)}</td>
                            <td style={{ textAlign: 'right' }}>{money(row.serviceTotal)}</td>
                            {isAdmin && <td style={{ textAlign: 'right' }}>{money(row.cogs)}</td>}
                            <td style={{ textAlign: 'right' }}>{money(row.paid)}</td>
                            <td style={{ textAlign: 'right', color: row.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              {money(row.balance)}
                            </td>
                            <td><span className="badge">{row.isVoided ? 'Voided' : row.paymentStatus}</span></td>
                            <td>{row.soldBy}</td>
                          </>
                        )}
                        {activeReport === 'purchases' && (
                          <>
                            <td><strong>{row.invoiceNo}</strong></td>
                            <td>{fmtDate(row.date)}</td>
                            <td>{row.type}</td>
                            <td><strong>{row.partyName}</strong></td>
                            <td>{row.paymentMethod}</td>
                            <td style={{ textAlign: 'right' }}>{money(row.total)}</td>
                            <td style={{ textAlign: 'right' }}>{money(row.paid)}</td>
                            <td style={{ textAlign: 'right', color: row.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              {money(row.balance)}
                            </td>
                            <td><span className="badge">{row.paymentStatus}</span></td>
                            <td>{row.createdBy}</td>
                          </>
                        )}
                        {activeReport === 'repairs' && (
                          <>
                            <td><strong>{row.trackingId}</strong></td>
                            <td>{fmtDate(row.date)}</td>
                            <td><strong>{row.customerName}</strong></td>
                            <td>{row.jobType}</td>
                            <td>{row.technicianName}</td>
                            <td><span className="badge">{row.status}</span></td>
                            <td style={{ textAlign: 'right' }}>{money(row.total)}</td>
                            <td style={{ textAlign: 'right' }}>{money(row.paid)}</td>
                            <td style={{ textAlign: 'right', color: row.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              {money(row.remaining)}
                            </td>
                            <td>{fmtDate(row.expectedCompletion)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                        No records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
