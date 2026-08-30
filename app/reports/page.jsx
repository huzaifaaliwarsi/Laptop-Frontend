'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import { TableRowSkeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../context/AuthContext';

// =============================================================================
// HELPERS
// =============================================================================
const EPSILON = 0.005;

function r2(v) { return Math.round((parseFloat(v) || 0) * 100) / 100; }

function money(v) {
  const n = r2(v);
  return 'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function moneyFull(v) {
  const n = r2(v);
  return 'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' });
}

function pct(v) { return (r2(v)).toFixed(1) + '%'; }

function SBadge({ status, isVoided }) {
  if (isVoided) return <span className="badge danger">Voided</span>;
  const map = {
    'Paid': 'success', 'Partial': 'warning', 'Unpaid': 'danger',
    'Settled': 'success', 'Open': 'warning', 'Cancelled': 'danger',
    'Delivered & Closed': 'success', 'Ready for Delivery': '',
    'Work in Progress': 'warning', 'Waiting for Parts': 'warning',
    'Waiting for Customer Approval': 'warning',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

// =============================================================================
// KPI CARD — matches screenshot style
// =============================================================================
function KPICard({ label, value, sub, accent, loading }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minHeight: 90
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent || '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {loading ? (
        <div style={{ height: 28, borderRadius: 4, background: '#f1f5f9', animation: 'pulse 1.4s ease-in-out infinite', width: '70%' }} />
      ) : (
        <strong style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{value}</strong>
      )}
      {sub && <small style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</small>}
    </div>
  );
}

// =============================================================================
// TABS CONFIG
// =============================================================================
const TABS = [
  { key: 'overview',        label: 'Overview',           adminOnly: false },
  { key: 'sales',           label: 'Sales',              adminOnly: false },
  { key: 'purchases',       label: 'Purchases',          adminOnly: true  },
  { key: 'cash-online',     label: 'Cash & Online',      adminOnly: true  },
  { key: 'accounts',        label: 'Accounts',           adminOnly: true  },
  { key: 'inventory',       label: 'Inventory & COGS',   adminOnly: true  },
  { key: 'profit-loss',     label: 'Profit & Loss',      adminOnly: true  },
  { key: 'repairs',         label: 'Repair Operations',  adminOnly: false },
  { key: 'expenses',        label: 'Expenses',           adminOnly: true  },
  { key: 'voids-returns',   label: 'Voids & Returns',    adminOnly: true  },
];

// =============================================================================
// MAIN PAGE
// =============================================================================
export default function ReportsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);
  const [activeTab, setActiveTab] = useState('overview');
  const [fromDate, setFromDate]   = useState('');
  const [toDate, setToDate]       = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [pmFilter, setPmFilter]   = useState('');
  const [staffList, setStaffList] = useState([]);

  // Per-tab data
  const [overview, setOverview]   = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableSummary, setTableSummary] = useState(null);
  const [pnlData, setPnlData]     = useState(null);
  const [cashData, setCashData]   = useState(null);
  const [acctData, setAcctData]   = useState(null);
  const [loading, setLoading]     = useState(true);

  // Load staff list once
  useEffect(() => {
    if (isAdmin) {
      api.get('/staff').then(r => {
        if (r.success) setStaffList(r.data || []);
      }).catch(() => {});
    }
  }, [isAdmin]);

  const buildQS = useCallback(() => {
    const qs = new URLSearchParams();
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    if (staffFilter) qs.set('staffId', staffFilter);
    if (pmFilter) qs.set('paymentMethod', pmFilter);
    return qs.toString();
  }, [fromDate, toDate, staffFilter, pmFilter]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setTableData([]);
    setTableSummary(null);
    setPnlData(null);
    setCashData(null);
    setAcctData(null);

    const qs = buildQS();
    const q = qs ? `?${qs}` : '';

    try {
      if (activeTab === 'overview') {
        // Parallel: PnL + Cash Balance + Repairs summary
        const [plRes, cashRes, repRes, invRes] = await Promise.all([
          isAdmin ? api.get(`/reports/profit-loss${q}`) : Promise.resolve(null),
          isAdmin ? api.get(`/reports/cash-balance${q}`) : Promise.resolve(null),
          api.get(`/reports/repairs${q}`),
          isAdmin ? api.get(`/reports/inventory${q}`) : Promise.resolve(null),
        ]);
        setOverview({ pl: plRes?.data, cash: cashRes?.data, rep: repRes?.summary, inv: invRes?.summary });

      } else if (activeTab === 'profit-loss') {
        const r = await api.get(`/reports/profit-loss${q}`);
        if (r.success) setPnlData(r.data);

      } else if (activeTab === 'cash-online') {
        const r = await api.get(`/reports/cash-balance${q}`);
        if (r.success) setCashData(r.data);

      } else if (activeTab === 'accounts') {
        // Show from accounts table directly
        const r = await api.get(`/accounts${q}`);
        if (r.success) { setTableData(r.data || []); }

      } else if (activeTab === 'voids-returns') {
        const r = await api.get(`/reports/returns${q}`);
        if (r.success) { setTableData(r.data || []); setTableSummary(r.summary); }

      } else if (activeTab === 'sales') {
        const r = await api.get(`/reports/sales${q}`);
        if (r.success) { setTableData(r.data || []); setTableSummary(r.summary); }

      } else if (activeTab === 'purchases') {
        const r = await api.get(`/reports/purchases${q}`);
        if (r.success) { setTableData(r.data || []); setTableSummary(r.summary); }

      } else if (activeTab === 'inventory') {
        const r = await api.get(`/reports/inventory${q}`);
        if (r.success) { setTableData(r.data || []); setTableSummary(r.summary); }

      } else if (activeTab === 'repairs') {
        const r = await api.get(`/reports/repairs${q}`);
        if (r.success) { setTableData(r.data || []); setTableSummary(r.summary); }

      } else if (activeTab === 'expenses') {
        const r = await api.get(`/reports/expenses${q}`);
        if (r.success) { setTableData(r.data || []); setTableSummary(r.summary); }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab, buildQS, isAdmin]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const downloadCSV = () => {
    const map = { sales: 'sales', purchases: 'purchases', inventory: 'inventory', repairs: 'repairs', expenses: 'expenses', 'voids-returns': 'returns' };
    const csvType = map[activeTab];
    if (!csvType) return;
    const qs = buildQS();
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const url = `${baseUrl}/api/reports/csv/${csvType}${qs ? '?' + qs : ''}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${csvType}-report.csv`; a.click();
      }).catch(console.error);
  };

  const showCSV = ['sales', 'purchases', 'inventory', 'repairs', 'expenses', 'voids-returns'].includes(activeTab);

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Sales, cash, COGS, profit/loss and staff analytics</p>
      </div>

      {/* ── FILTER PANEL ── */}
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head" style={{ paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="sliders" size={13} />
            <strong style={{ fontSize: 12 }}>Report Filters</strong>
          </div>
          <small style={{ fontSize: 11, color: 'var(--muted)' }}>Filter the report period, staff member and payment method.</small>
        </div>
        <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>From Date</label>
            <input className="input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>To Date</label>
            <input className="input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          {isAdmin && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Staff / Portal User</label>
              <select className="input" value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ width: '100%' }}>
                <option value="">All Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Payment Method</label>
            <select className="input" value={pmFilter} onChange={e => setPmFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', paddingBottom: 1 }}>
            {(fromDate || toDate || staffFilter || pmFilter) && (
              <button type="button" className="btn btn-ghost" onClick={() => { setFromDate(''); setToDate(''); setStaffFilter(''); setPmFilter(''); }} style={{ fontSize: 11 }}>
                <Icon name="x" size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS + ACTIONS ── */}
      <div className="panel" style={{ marginTop: 0 }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="tabs">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                type="button"
                className={`tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {showCSV && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={downloadCSV}>
                <Icon name="download" size={12} /> Export CSV
              </button>
            )}
            <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => window.print()}>
              <Icon name="printer" size={12} /> Print
            </button>
            <button type="button" className="btn" style={{ fontSize: 11 }} onClick={loadReport}>
              <Icon name="refresh-cw" size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* ============================================================
            OVERVIEW TAB
        ============================================================ */}
        {activeTab === 'overview' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>

              {/* Repair section */}
              <KPICard label="Repair / Diagnosis Revenue" loading={loading}
                value={money(overview?.rep?.deliveredRevenue)}
                sub="Final repair and diagnosis invoices" />
              <KPICard label="Repair Collected" loading={loading}
                value={money(overview?.rep?.totalPaid)}
                sub="Initial and installment payments" />
              <KPICard label="Repair Outstanding" loading={loading}
                value={money(overview?.rep?.totalOutstanding)}
                sub="Open customer repair balances"
                accent={overview?.rep?.totalOutstanding > 0 ? '#dc2626' : undefined} />
              <KPICard label="Repair Parts COGS" loading={loading}
                value={money(overview?.pl?.repairCogs)}
                sub="Cost snapshots on parts used" />

              {/* Cash & Sales */}
              <KPICard label="Current Cash in Hand" loading={loading}
                value={money(overview?.cash?.cash?.balance)}
                sub="All-time cash inflow minus cash outflow"
                accent={overview?.cash?.cash?.balance < 0 ? '#dc2626' : '#16a34a'} />
              <KPICard label="Current Online Balance" loading={loading}
                value={money(overview?.cash?.online?.balance)}
                sub="All-time online inflow minus online outflow"
                accent={overview?.cash?.online?.balance < 0 ? '#dc2626' : '#2563eb'} />
              <KPICard label="Net Product Sales" loading={loading}
                value={money(overview?.pl?.netProductSales)}
                sub="Product sales less voided sales" />
              <KPICard label="Service Sales" loading={loading}
                value={money(overview?.pl?.serviceSales)}
                sub="Ready for future Service Invoices" />

              {/* P&L */}
              <KPICard label="COGS" loading={loading}
                value={money(overview?.pl?.totalCogs)}
                sub="Cost of products actually sold"
                accent="#dc2626" />
              <KPICard label="Gross Profit" loading={loading}
                value={money(overview?.pl?.grossProfit)}
                sub="Revenue less COGS and exchange cost"
                accent={overview?.pl?.grossProfit >= 0 ? '#16a34a' : '#dc2626'} />
              <KPICard label="Net Profit" loading={loading}
                value={money(overview?.pl?.netProfit)}
                sub="Gross profit less operating expenses"
                accent={overview?.pl?.netProfit >= 0 ? '#16a34a' : '#dc2626'} />
              <KPICard label="Receivable / Payable" loading={loading}
                value={money(overview?.pl?.buybackCost)}
                sub="Non-cash vendor settlements" />

              {/* Inventory */}
              <KPICard label="Stock Cost Value" loading={loading}
                value={money(overview?.inv?.totalCostValue)}
                sub={`${overview?.inv?.totalUnits || 0} units on hand`} />
              <KPICard label="Stock Sale Value" loading={loading}
                value={money(overview?.inv?.totalSaleValue)}
                sub="At expected sale price" accent="#2563eb" />
              <KPICard label="Unrealised Margin" loading={loading}
                value={money(overview?.inv?.totalUnrealisedMargin)}
                sub="Sale Value − Cost Value" accent="#16a34a" />
              <KPICard label="Low Stock Items" loading={loading}
                value={overview?.inv?.lowStockCount ?? '—'}
                sub="Products below alert threshold"
                accent={overview?.inv?.lowStockCount > 0 ? '#d97706' : undefined} />
            </div>
          </div>
        )}

        {/* ============================================================
            SALES TAB
        ============================================================ */}
        {activeTab === 'sales' && (
          <>
            {tableSummary && (
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <KPICard label="Gross Sales" value={money(tableSummary.grossSales)} sub={`${tableSummary.count} invoices`} />
                {isAdmin && <KPICard label="Total COGS" value={money(tableSummary.totalCogs)} accent="#dc2626" sub="Cost price snapshots" />}
                {isAdmin && <KPICard label="Gross Profit" value={money(tableSummary.grossProfit)} accent={tableSummary.grossProfit >= 0 ? '#16a34a' : '#dc2626'} />}
                <KPICard label="Outstanding" value={money(tableSummary.totalOutstanding)} accent={tableSummary.totalOutstanding > 0 ? '#dc2626' : '#16a34a'} />
              </div>
            )}
            <ReportTable loading={loading} cols={[
              { label: 'Invoice No', key: 'invoiceNo', bold: true },
              { label: 'Date', key: 'date', fmt: fmtDate },
              { label: 'Customer', key: 'customerName' },
              { label: 'Type', key: 'type', render: v => <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#eff6ff', color: '#2563eb' }}>{v}</span> },
              { label: 'Payment', key: 'paymentMethod' },
              { label: 'Total', key: 'total', right: true, fmt: money },
              { label: 'Paid', key: 'paid', right: true, fmt: money, color: '#16a34a' },
              ...(isAdmin ? [{ label: 'COGS', key: 'cogs', right: true, fmt: money, color: '#94a3b8' }] : []),
              { label: 'Remaining', key: 'remaining', right: true, fmt: money, colorFn: v => v > EPSILON ? '#dc2626' : '#16a34a' },
              { label: 'Status', key: 'paymentStatus', render: v => <SBadge status={v} /> },
              ...(isAdmin ? [{ label: 'By', key: 'soldBy', muted: true }] : []),
            ]} data={tableData} emptyMsg="No sales for this period." />
          </>
        )}

        {/* ============================================================
            PURCHASES TAB
        ============================================================ */}
        {activeTab === 'purchases' && (
          <>
            {tableSummary && (
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <KPICard label="Total Purchases" value={money(tableSummary.totalPurchases)} sub={`${tableSummary.count} invoices`} accent="#dc2626" />
                <KPICard label="Total Paid" value={money(tableSummary.totalPaid)} accent="#16a34a" />
                <KPICard label="Outstanding Payable" value={money(tableSummary.totalOutstanding)} accent={tableSummary.totalOutstanding > 0 ? '#d97706' : '#94a3b8'} />
              </div>
            )}
            <ReportTable loading={loading} cols={[
              { label: 'Invoice No', key: 'invoiceNo', bold: true },
              { label: 'Date', key: 'date', fmt: fmtDate },
              { label: 'Party', key: 'partyName' },
              { label: 'Type', key: 'type', render: v => <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#fff7ed', color: '#c2410c' }}>{v}</span> },
              { label: 'Payment', key: 'paymentMethod' },
              { label: 'Total', key: 'total', right: true, fmt: money },
              { label: 'Paid', key: 'paid', right: true, fmt: money, color: '#16a34a' },
              { label: 'Cr. Adj.', key: 'creditAdjusted', right: true, fmt: money, color: '#94a3b8' },
              { label: 'Remaining', key: 'remaining', right: true, fmt: money, colorFn: v => v > EPSILON ? '#dc2626' : '#16a34a' },
              { label: 'Status', key: 'paymentStatus', render: (v, row) => <SBadge status={v} isVoided={row.isVoided} /> },
              { label: 'By', key: 'createdBy', muted: true },
            ]} data={tableData} emptyMsg="No purchases for this period." />
          </>
        )}

        {/* ============================================================
            CASH & ONLINE TAB
        ============================================================ */}
        {activeTab === 'cash-online' && (
          <div style={{ padding: 16 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading balance data…</div>
            ) : cashData ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <KPICard label="Cash In Drawer" value={money(cashData.cash.balance)} accent={cashData.cash.balance >= 0 ? '#16a34a' : '#dc2626'} sub={`Opening: ${money(cashData.cash.opening)}`} />
                  <KPICard label="Online Balance" value={money(cashData.online.balance)} accent={cashData.online.balance >= 0 ? '#2563eb' : '#dc2626'} sub={`Opening: ${money(cashData.online.opening)}`} />
                  <KPICard label="Total Liquidity" value={money(cashData.totalLiquidity)} accent="#16a34a" sub="Cash + Online" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <FlowBox title="💵 Cash Flow" data={cashData.cash} color="#16a34a" />
                  <FlowBox title="🏦 Online Flow" data={cashData.online} color="#2563eb" />
                </div>
              </>
            ) : <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No data.</div>}
          </div>
        )}

        {/* ============================================================
            ACCOUNTS TAB
        ============================================================ */}
        {activeTab === 'accounts' && (
          <ReportTable loading={loading} cols={[
            { label: 'Date', key: 'date', fmt: fmtDate },
            { label: 'Type', key: 'type', render: v => <span className="badge">{v}</span> },
            { label: 'Party', key: 'party_name', bold: true },
            { label: 'Invoice No', key: 'invoice_no' },
            { label: 'Amount', key: 'amount', right: true, fmt: moneyFull },
            { label: 'Remaining', key: 'remaining', right: true, fmt: moneyFull, colorFn: v => v > EPSILON ? '#dc2626' : '#16a34a' },
            { label: 'Status', key: 'status', render: v => <SBadge status={v} /> },
          ]} data={tableData} emptyMsg="No account records." />
        )}

        {/* ============================================================
            INVENTORY & COGS TAB
        ============================================================ */}
        {activeTab === 'inventory' && (
          <>
            {tableSummary && (
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <KPICard label="Total SKUs" value={tableSummary.totalProducts} sub={`${tableSummary.totalUnits} units`} />
                <KPICard label="Stock Cost Value" value={money(tableSummary.totalCostValue)} accent="#dc2626" sub="current_stock × cost_price" />
                <KPICard label="Stock Sale Value" value={money(tableSummary.totalSaleValue)} accent="#2563eb" sub="current_stock × EP" />
                <KPICard label="Unrealised Margin" value={money(tableSummary.totalUnrealisedMargin)} accent="#16a34a" sub="Sale − Cost" />
              </div>
            )}
            <ReportTable loading={loading} cols={[
              { label: 'Code', key: 'code', bold: true, small: true },
              { label: 'Category', key: 'category', muted: true },
              { label: 'Brand / Model', key: 'brand', render: (v, row) => `${row.brand} ${row.model}` },
              { label: 'Condition', key: 'condition' },
              { label: 'Opening', key: 'initialStock', right: true, color: '#94a3b8' },
              { label: 'IN', key: 'stockIn', right: true, color: '#16a34a' },
              { label: 'OUT', key: 'stockOut', right: true, color: '#dc2626' },
              { label: 'On Hand', key: 'currentStock', right: true, bold: true },
              { label: 'Cost Price', key: 'costPrice', right: true, fmt: money },
              { label: 'Cost Value', key: 'costValue', right: true, fmt: money, color: '#dc2626' },
              { label: 'Sale Value', key: 'saleValue', right: true, fmt: money, color: '#16a34a' },
            ]} data={tableData} emptyMsg="No inventory data." />
          </>
        )}

        {/* ============================================================
            PROFIT & LOSS TAB
        ============================================================ */}
        {activeTab === 'profit-loss' && (
          <div style={{ padding: 16 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Calculating P&L…</div>
            ) : pnlData ? (
              <>
                {/* Top KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                  <KPICard label="Total Revenue" value={money(pnlData.totalRevenue)} />
                  <KPICard label="Total COGS" value={money(pnlData.totalCogs)} accent="#dc2626" />
                  <KPICard label="Gross Profit" value={money(pnlData.grossProfit)} accent={pnlData.grossProfit >= 0 ? '#16a34a' : '#dc2626'} sub={pct(pnlData.grossMarginPct)} />
                  <KPICard label="Operating Expenses" value={money(pnlData.operatingExpenses)} accent="#d97706" />
                  <KPICard label="Net Profit / (Loss)" value={money(pnlData.netProfit)} accent={pnlData.netProfit >= 0 ? '#16a34a' : '#dc2626'} sub={pct(pnlData.netMarginPct)} />
                </div>
                {/* Detail boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <PnLBox title="📈 Revenue Breakdown" rows={[
                    { label: 'Gross Retail Product Sales', value: money(pnlData.grossProductSales) },
                    pnlData.voidedProductSales > 0 && { label: 'Less: Voided Sales', value: `−${money(pnlData.voidedProductSales)}`, color: '#dc2626' },
                    pnlData.partialReturnAdj > 0 && { label: 'Less: Partial Returns', value: `−${money(pnlData.partialReturnAdj)}`, color: '#dc2626' },
                    { label: 'Net Retail Product Sales', value: money(pnlData.netProductSales), bold: true },
                    { label: 'Service & Installation Revenue', value: money(pnlData.serviceSales) },
                    { label: 'Repair Workshop Revenue', value: money(pnlData.repairRevenue) },
                    (pnlData.exchangeNetIncome !== 0) && { label: 'Exchange Net Income', value: money(pnlData.exchangeNetIncome), color: pnlData.exchangeNetIncome >= 0 ? '#16a34a' : '#dc2626' },
                    pnlData.customSaleRevenue > 0 && { label: 'Custom Sale Revenue', value: money(pnlData.customSaleRevenue) },
                    { label: 'Total Net Operating Revenue', value: money(pnlData.totalRevenue), bold: true, total: true },
                  ].filter(Boolean)} />
                  <PnLBox title="📉 COGS & Expenses" rows={[
                    { label: 'Retail Inventory COGS', value: money(pnlData.retailCogs) },
                    pnlData.voidedCogs > 0 && { label: 'Less: COGS Reversed (Voids)', value: `−${money(pnlData.voidedCogs)}`, color: '#16a34a' },
                    { label: 'Net Retail COGS', value: money(pnlData.netRetailCogs), bold: true },
                    { label: 'Repair Parts COGS', value: money(pnlData.repairCogs) },
                    pnlData.customSaleCogs > 0 && { label: 'Custom Sale Source Cost', value: money(pnlData.customSaleCogs) },
                    { label: 'Total Cost of Goods Sold', value: money(pnlData.totalCogs), bold: true },
                    { label: 'Gross Profit', value: `${money(pnlData.grossProfit)} (${pct(pnlData.grossMarginPct)})`, bold: true, total: true, color: pnlData.grossProfit >= 0 ? '#16a34a' : '#dc2626' },
                    { label: 'Less: Operating Expenses', value: `−${money(pnlData.operatingExpenses)}`, color: '#dc2626' },
                    { label: 'Net Profit / (Loss)', value: `${money(pnlData.netProfit)} (${pct(pnlData.netMarginPct)})`, bold: true, total: true, color: pnlData.netProfit >= 0 ? '#16a34a' : '#dc2626' },
                  ].filter(Boolean)} />
                </div>
              </>
            ) : <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No data.</div>}
          </div>
        )}

        {/* ============================================================
            REPAIR OPERATIONS TAB
        ============================================================ */}
        {activeTab === 'repairs' && (
          <>
            {tableSummary && (
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <KPICard label="Total Jobs" value={tableSummary.count} />
                <KPICard label="Delivered Revenue" value={money(tableSummary.deliveredRevenue)} accent="#16a34a" sub="Delivered & Closed jobs" />
                <KPICard label="Collected" value={money(tableSummary.totalPaid)} accent="#2563eb" />
                <KPICard label="Outstanding" value={money(tableSummary.totalOutstanding)} accent={tableSummary.totalOutstanding > 0 ? '#dc2626' : '#16a34a'} />
              </div>
            )}
            <ReportTable loading={loading} cols={[
              { label: 'Tracking ID', key: 'trackingId', bold: true, small: true },
              { label: 'Date', key: 'date', fmt: fmtDate },
              { label: 'Category', key: 'categoryName', muted: true },
              { label: 'Customer', key: 'customerName' },
              { label: 'Technician', key: 'technicianName', muted: true },
              { label: 'Status', key: 'status', render: v => <SBadge status={v} /> },
              { label: 'Total', key: 'total', right: true, fmt: money },
              { label: 'Paid', key: 'paid', right: true, fmt: money, color: '#16a34a' },
              { label: 'Remaining', key: 'remaining', right: true, fmt: money, colorFn: v => v > EPSILON ? '#dc2626' : '#16a34a' },
              { label: 'Expected', key: 'expectedCompletion', fmt: fmtDate, muted: true },
            ]} data={tableData} emptyMsg="No repair jobs for this period." />
          </>
        )}

        {/* ============================================================
            EXPENSES TAB
        ============================================================ */}
        {activeTab === 'expenses' && (
          <>
            {tableSummary && (
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <KPICard label="Total Expenses" value={money(tableSummary.totalAmount)} accent="#dc2626" sub={`${tableSummary.count} entries`} />
                <KPICard label="Paid by Cash" value={money(tableSummary.totalCash)} accent="#d97706" />
                <KPICard label="Paid Online" value={money(tableSummary.totalOnline)} accent="#2563eb" />
              </div>
            )}
            <ReportTable loading={loading} cols={[
              { label: 'Date', key: 'date', fmt: fmtDate },
              { label: 'Category', key: 'category', render: v => <span className="badge">{v}</span> },
              { label: 'Description', key: 'description' },
              { label: 'Amount', key: 'amount', right: true, fmt: money, color: '#dc2626', bold: true },
              { label: 'Payment', key: 'paymentMethod' },
              { label: 'Reference', key: 'referenceId', muted: true },
              { label: 'By', key: 'createdBy', muted: true },
            ]} data={tableData} emptyMsg="No expenses for this period." />
          </>
        )}

        {/* ============================================================
            VOIDS & RETURNS TAB
        ============================================================ */}
        {activeTab === 'voids-returns' && (
          <>
            {tableSummary && (
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <KPICard label="Total Returns" value={tableSummary.totalReturns} />
                <KPICard label="Return Amount" value={money(tableSummary.totalReturnAmount)} accent="#dc2626" />
                <KPICard label="Total Refunded" value={money(tableSummary.totalRefunded)} accent="#d97706" sub="≤ Amount Collected" />
                <KPICard label="COGS Reversed" value={money(tableSummary.totalCogsReversed)} accent="#16a34a" sub="Cost restored" />
              </div>
            )}
            <ReportTable loading={loading} cols={[
              { label: 'Invoice No', key: 'invoiceNo', bold: true },
              { label: 'Return Date', key: 'voidDate', fmt: fmtDate },
              { label: 'Customer', key: 'customerName' },
              { label: 'Return Type', key: 'returnType', render: v => <span className={`badge ${v === 'Full Void' ? 'danger' : 'warning'}`}>{v}</span> },
              { label: 'Return Amount', key: 'returnAmount', right: true, fmt: money, color: '#dc2626' },
              { label: 'Was Paid', key: 'wasPaid', right: true, fmt: money },
              { label: 'Refunded', key: 'refundAmount', right: true, fmt: money, color: '#d97706' },
              { label: 'Method', key: 'refundMethod' },
              { label: 'Reason', key: 'voidReason', muted: true },
              { label: 'COGS Rev.', key: 'cogsReversed', right: true, fmt: money, color: '#16a34a' },
            ]} data={tableData} emptyMsg="No returns for this period." />
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Generic report table renderer */
function ReportTable({ loading, cols, data, emptyMsg }) {
  return (
    <div className="table-wrap" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} style={{ textAlign: c.right ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableRowSkeleton cols={cols.length} rows={7} />
          ) : data.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>{emptyMsg}</td></tr>
          ) : data.map((row, ri) => (
            <tr key={row.id || ri}>
              {cols.map((c, ci) => {
                let val = c.key ? row[c.key] : undefined;
                if (c.render) return <td key={ci} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.render(val, row)}</td>;
                const disp = c.fmt ? c.fmt(val) : (val ?? '—');
                const color = c.colorFn ? c.colorFn(parseFloat(val)) : c.color;
                return (
                  <td key={ci} style={{
                    textAlign: c.right ? 'right' : 'left',
                    color: color || undefined,
                    fontWeight: c.bold ? 700 : undefined,
                    fontSize: c.small ? 11 : undefined,
                    opacity: c.muted ? 0.65 : 1,
                    whiteSpace: 'nowrap'
                  }}>
                    {disp}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cash/Online waterfall box */
function FlowBox({ title, data, color }) {
  const rows = [
    { label: 'Opening Balance', value: data.opening, color: undefined },
    { label: '+ Total Received', value: data.received, color: '#16a34a' },
    { label: '− Paid Out', value: data.paidOut, color: '#dc2626', neg: true },
    { label: '− Operating Expenses', value: data.expenses, color: '#dc2626', neg: true },
    { label: '= Balance', value: data.balance, color: data.balance >= 0 ? color : '#dc2626', bold: true, total: true },
  ];
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <strong style={{ fontSize: 13 }}>{title}</strong>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '9px 14px',
          background: r.total ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#fafbfc',
          borderTop: r.total ? '2px solid #e2e8f0' : '1px solid #f1f5f9'
        }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{r.label}</span>
          <strong style={{ fontSize: 13, color: r.color || '#1e293b', fontWeight: r.bold ? 800 : 600 }}>
            {r.neg ? '−' : ''}{moneyFull(r.neg ? r.value : r.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

/** P&L detail breakdown box */
function PnLBox({ title, rows }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <strong style={{ fontSize: 13 }}>{title}</strong>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 14px',
          background: r.total ? '#f8fafc' : i % 2 === 0 ? '#fff' : '#fafbfc',
          borderTop: r.total ? '2px solid #e2e8f0' : '1px solid #f1f5f9'
        }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{r.label}</span>
          <strong style={{ fontSize: 13, color: r.color || '#1e293b', fontWeight: r.bold ? 800 : 500 }}>
            {r.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
