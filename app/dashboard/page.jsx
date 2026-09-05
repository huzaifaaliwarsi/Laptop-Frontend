'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import SalesInvoiceModal from '../../components/modules/pos/SalesInvoiceModal';
import CreateRepairJobModal from '../../components/modules/repairs/CreateRepairJobModal';
import AddProductModal from '../../components/modules/inventory/AddProductModal';
import ExpenseModal from '../../components/modules/expenses/ExpenseModal';
import InvoicePreviewModal from '../../components/modules/invoice/InvoicePreviewModal';
import CashDrawerModal from '../../components/modules/pos/CashDrawerModal';
import DashboardSkeleton from '../../components/common/DashboardSkeleton';
import { useToast } from '../../components/common/Toast';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function DashboardPage() {
  const { user, role, effectiveRole } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isRepairOpen, setIsRepairOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadDashboard = () => {
    setLoading(true);
    api.get('/reports/dashboard')
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOpenInvoice = async (inv) => {
    try {
      const res = await api.get(`/invoices/${inv.id || inv.invoice_no}`);
      if (res.success) setPreviewInvoice(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const currentRole = effectiveRole || role;
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';

  if (loading && !data) {
    return <DashboardSkeleton role={currentRole} />;
  }
  const stats = data?.stats || {};
  const recentInvoices = data?.recentInvoices || [];
  const recentRepairs = data?.recentRepairs || [];
  const recentExpenses = data?.recentExpenses || [];
  const lowStock = data?.lowStock || [];

  return (
    <div className="dashboard-container space-y-4">
      {/* Hero Banner */}
      <div className="hero p-5 rounded-2xl bg-gradient-to-r from-white via-blue-50/40 to-blue-100/40 border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight m-0">
            {isAdmin ? 'Branch Admin Dashboard' : 'Sales & Reception Counter'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Welcome back, <strong>{user?.name || 'Administrator'}</strong>. Real-time operations & live metrics from all business sections.
          </p>
        </div>

        {/* Delete Shortcuts*/}
        {/* <div className="hero-actions flex gap-2 flex-wrap items-center">
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            onClick={() => setIsSaleOpen(true)}
          >
            <Icon name="cart" /> + New POS Sale
          </button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            onClick={() => setIsRepairOpen(true)}
          >
            <Icon name="wrench" /> + Intake Repair Job
          </button>
          {isAdmin && (
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
              onClick={() => setIsProductOpen(true)}
            >
              <Icon name="boxes" /> + Add Inventory
            </button>
          )}
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            onClick={() => setIsExpenseOpen(true)}
          >
            <Icon name="banknote" /> + Record Expense
          </button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            onClick={() => setIsCashDrawerOpen(true)}
          >
            <Wallet size={13} /> + Cash Drawer
          </button>
        </div> */}
      </div>

      {/* KPI Cards */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Sales Revenue */}
          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>TOTAL SALES REVENUE</span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center"><Icon name="receipt" /></span>
            </div>
            <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">{money(stats.totalSales)}</div>
            <div className="stat-note text-xs text-slate-400 mt-1">
              Today: <strong className="text-emerald-600">{money(stats.todaySales)}</strong> ({stats.todaySalesCount || 0} bills)
            </div>
          </div>

          {/* Active Workshop */}
          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>ACTIVE WORKSHOP JOBS</span>
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 grid place-items-center"><Icon name="wrench" /></span>
            </div>
            <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">{stats.activeRepairs || 0}</div>
            <div className="stat-note text-xs text-slate-400 mt-1">
              {stats.inProgress || 0} in progress · {stats.readyDelivery || 0} ready for delivery
            </div>
          </div>

          {/* Customer Receivables */}
          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>CUSTOMER RECEIVABLES (UDHAAR)</span>
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 grid place-items-center"><Icon name="wallet" /></span>
            </div>
            <div className={`stat-value text-2xl font-bold mt-2 tracking-tight ${stats.customerReceivables > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {money(stats.customerReceivables)}
            </div>
            <div className="stat-note text-xs text-slate-400 mt-1">
              Vendor Payables: <strong>{money(stats.vendorPayables)}</strong>
            </div>
          </div>

          {/* Inventory Valuation */}
          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>INVENTORY ASSETS</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 grid place-items-center"><Icon name="boxes" /></span>
            </div>
            <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">{stats.currentStock || 0} <span className="text-sm font-normal text-slate-400">units</span></div>
            <div className="stat-note text-xs text-slate-400 mt-1">
              Valuation: <strong className="text-slate-700">{money(stats.stockCostValue)}</strong> (Cost)
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>RETAIL BILLING TODAY</span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center"><Icon name="receipt" /></span>
            </div>
            <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">{money(stats.retailBilling)}</div>
            <div className="stat-note text-xs text-slate-400 mt-1">{stats.retailCount || 0} sales invoices processed</div>
          </div>

          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>CASH COLLECTED</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 grid place-items-center"><Icon name="banknote" /></span>
            </div>
            <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">{money(stats.cashCollected)}</div>
            <div className="stat-note text-xs text-slate-400 mt-1">Cash drawer collections</div>
          </div>

          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>ONLINE COLLECTED</span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center"><Icon name="creditCard" /></span>
            </div>
            <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">{money(stats.onlineCollected)}</div>
            <div className="stat-note text-xs text-slate-400 mt-1">Bank transfer receipts</div>
          </div>

          <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>OUTSTANDING BALANCE</span>
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 grid place-items-center"><Icon name="wallet" /></span>
            </div>
            <div className={`stat-value text-2xl font-bold mt-2 tracking-tight ${stats.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {money(stats.outstandingBalance)}
            </div>
            <div className="stat-note text-xs text-slate-400 mt-1">{stats.pendingInvoices || 0} pending credit invoices</div>
          </div>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/pos" className="quick bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all text-slate-800">
          <Icon name="cart" />
          <strong className="block text-xs font-bold text-slate-900 mt-2">Open POS Counter</strong>
          <span className="text-[10px] text-slate-400">Direct sales & exchange</span>
        </Link>
        <Link href="/repairs" className="quick bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all text-slate-800">
          <Icon name="wrench" />
          <strong className="block text-xs font-bold text-slate-900 mt-2">Repair Workshop</strong>
          <span className="text-[10px] text-slate-400">Jobs & diagnostic tracking</span>
        </Link>
        <Link href="/inventory" className="quick bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all text-slate-800">
          <Icon name="boxes" />
          <strong className="block text-xs font-bold text-slate-900 mt-2">Inventory Matrix</strong>
          <span className="text-[10px] text-slate-400">Stock & low-alert items</span>
        </Link>
        <Link href="/ledger" className="quick bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all text-slate-800">
          <Icon name="book" />
          <strong className="block text-xs font-bold text-slate-900 mt-2">Financial Ledger</strong>
          <span className="text-[10px] text-slate-400">Customer & vendor khata</span>
        </Link>
      </div>

      {/* Grid: Recent Invoices & Active Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="panel bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="panel-head p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 m-0">Recent Completed Invoices</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Latest sales & purchases</p>
            </div>
            <Link href="/sales-purchases" className="text-xs font-bold text-blue-600 hover:text-blue-700">View All →</Link>
          </div>
          <div className="panel-body p-0">
            <div className="table-wrap w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-2.5">Invoice</th>
                    <th className="p-2.5">Party</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 font-bold text-slate-800">{inv.invoice_no}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{inv.party_name}</td>
                        <td className="p-2.5 text-slate-500">{fmtDate(inv.date)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{money(inv.total)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
                            onClick={() => handleOpenInvoice(inv)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-6 text-slate-400">No recent invoices recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Active Repair Workshop Queue */}
        <div className="panel bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="panel-head p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 m-0">Active Repair Workshop Queue</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Live repair jobs & turnaround tracking</p>
            </div>
            <Link href="/repairs" className="text-xs font-bold text-blue-600 hover:text-blue-700">Workshop →</Link>
          </div>
          <div className="panel-body p-0">
            <div className="table-wrap w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-2.5">Job ID</th>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5">Device</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRepairs.length > 0 ? (
                    recentRepairs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 font-bold text-slate-800">
                          <Link href="/repairs" className="text-blue-600 hover:underline">{job.tracking_id || job.id}</Link>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-700">{job.customer_name}</td>
                        <td className="p-2.5 text-slate-500">{job.brand} {job.model}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${job.status === 'Ready for Delivery' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            job.status === 'Waiting for Customer Approval' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{money(job.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-slate-400">No active repair jobs</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Low Stock & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Items */}
        <div className="panel bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="panel-head p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 m-0">Low Stock Reorder Alerts</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Critical inventory alerts below threshold</p>
            </div>
            <Link href="/inventory" className="text-xs font-bold text-blue-600 hover:text-blue-700">Inventory Matrix →</Link>
          </div>
          <div className="panel-body p-0">
            <div className="table-wrap w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Current Stock</th>
                    <th className="p-2.5 text-right">Sale Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.length > 0 ? (
                    lowStock.map((p) => (
                      <tr key={p.code} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 font-bold text-slate-800">{p.code}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{p.brand} {p.model}</td>
                        <td className="p-2.5 text-slate-500">{p.category || 'General'}</td>
                        <td className="p-2.5 text-right font-bold text-rose-600">
                          {p.current_stock} <span className="text-[10px] text-slate-400">/ min {p.low_stock_alert}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{money(p.sale_price)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-emerald-600 font-semibold">
                        All product stocks are at healthy operational levels!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="panel bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="panel-head p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 m-0">Recent Shop Expenses</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Recorded operational overheads</p>
            </div>
            <Link href="/expenses" className="text-xs font-bold text-blue-600 hover:text-blue-700">Expense Ledger →</Link>
          </div>
          <div className="panel-body p-0">
            <div className="table-wrap w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Expense Title</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Payment</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExpenses.length > 0 ? (
                    recentExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 text-slate-500">{fmtDate(exp.date)}</td>
                        <td className="p-2.5 font-bold text-slate-800">{exp.title}</td>
                        <td className="p-2.5 text-slate-600">{exp.category}</td>
                        <td className="p-2.5 text-slate-500">{exp.payment_method}</td>
                        <td className="p-2.5 text-right font-bold text-rose-600">{money(exp.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-slate-400">No recent expenses recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SalesInvoiceModal
        isOpen={isSaleOpen}
        onClose={() => setIsSaleOpen(false)}
        onSuccess={(inv, shouldPreview = true) => {
          loadDashboard();
          if (shouldPreview) {
            setPreviewInvoice(inv);
          }
        }}
      />

      <CreateRepairJobModal
        isOpen={isRepairOpen}
        onClose={() => setIsRepairOpen(false)}
        onSuccess={() => loadDashboard()}
      />

      <AddProductModal
        isOpen={isProductOpen}
        onClose={() => setIsProductOpen(false)}
        onSuccess={() => loadDashboard()}
      />

      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onSuccess={() => loadDashboard()}
      />

      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
      />

      <CashDrawerModal
        isOpen={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
      />
    </div>
  );
}
