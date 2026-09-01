'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import {
  Building2,
  RefreshCw,
  PlusCircle,
  Edit3,
  Key,
  Power,
  Database,
  Sliders,
  X,
  AlertTriangle,
  Eye,
  LogIn,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Activity,
  Trash2,
  LogOut,
  Archive,
  UserCheck,
  Shield
} from 'lucide-react';

function money(v) {
  const n = Math.round((parseFloat(v) || 0) * 100) / 100;
  return 'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  } catch (e) {
    return '—';
  }
}

function StatCard({ label, value, sub, icon, badge, loading }) {
  return (
    <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs relative overflow-hidden transition-all hover:shadow-xs">
      <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
        <span>{label}</span>
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80 grid place-items-center">
          <Icon name={icon || 'receipt'} />
        </span>
      </div>
      {loading ? (
        <div className="flex items-center h-8 gap-2 mt-2">
          <div className="loader loader-xs"></div>
        </div>
      ) : (
        <div className="stat-value text-2xl font-bold text-slate-900 mt-2 tracking-tight">
          {value}
        </div>
      )}
      {sub && (
        <div className="stat-note text-xs text-slate-500 mt-1.5 flex items-center justify-between">
          <span>{sub}</span>
          {badge && <span className="font-semibold text-blue-600">{badge}</span>}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  const { user, role, switchBranch, switchPortalView, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get('tab') : null;
  const activeTab = (tabParam && ['overview', 'branches', 'delete_branch', 'reports', 'audit_security'].includes(tabParam)) ? tabParam : 'overview';

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateFilter, setDateFilter] = useState('all_time');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals
  const [viewDetailsBranch, setViewDetailsBranch] = useState(null);
  const [resetModalBranch, setResetModalBranch] = useState(null);
  const [newAdminPass, setNewAdminPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const [editModalBranch, setEditModalBranch] = useState(null);
  const [editForm, setEditForm] = useState({ branch_name: '', phone: '', email: '', city: '', address: '', admin_name: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal
  const [deleteModalBranch, setDeleteModalBranch] = useState(null);
  const [deleteSafetyData, setDeleteSafetyData] = useState(null);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const [typedBranchCode, setTypedBranchCode] = useState('');
  const [superAdminPass, setSuperAdminPass] = useState('');
  const [deletingBranch, setDeletingBranch] = useState(false);

  // Audit Logs & Admins
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [branchAdminsList, setBranchAdminsList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Security
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [updatingMasterPass, setUpdatingMasterPass] = useState(false);

  useEffect(() => {
    if (role && role !== 'super_admin') {
      toast('Access restricted to Platform Super Admin.', 'error');
      router.push('/');
    }
  }, [role, router, toast]);

  const loadConsolidatedReport = useCallback(async () => {
    setLoading(true);
    try {
      let from = null;
      let to = null;
      const todayStr = new Date().toISOString().split('T')[0];

      if (dateFilter === 'today') {
        from = todayStr;
        to = todayStr;
      } else if (dateFilter === 'this_month') {
        const now = new Date();
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        to = todayStr;
      } else if (dateFilter === 'custom') {
        from = fromDate || null;
        to = toDate || null;
      }

      const params = new URLSearchParams();
      params.append('branchId', selectedBranch);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      params.append('_t', String(Date.now()));

      const res = await api.get(`/super-admin/reports/consolidated?${params.toString()}`);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error loading platform report', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, dateFilter, fromDate, toDate, toast]);

  const handleRefresh = async () => {
    await loadConsolidatedReport();
    if (activeTab === 'audit_security') {
      await loadAuditLogs();
      await loadBranchAdmins();
    }
    toast('Data refreshed from live databases.', 'success');
  };

  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/super-admin/audit-logs?limit=50');
      if (res.success) setAuditLogs(res.data || []);
    } catch (err) {
      toast(err.message || 'Error loading audit logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadBranchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.get('/super-admin/branch-admins');
      if (res.success) setBranchAdminsList(res.data || []);
    } catch (err) {
      toast(err.message || 'Error loading branch admins', 'error');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (role === 'super_admin') {
      loadConsolidatedReport();
    }
  }, [role, loadConsolidatedReport]);

  useEffect(() => {
    if (activeTab === 'audit_security') {
      loadAuditLogs();
      loadBranchAdmins();
    }
  }, [activeTab]);

  const handleToggleStatus = async (branchId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} this branch?`)) return;

    try {
      const res = await api.patch(`/super-admin/branches/${branchId}/status`, { status: newStatus });
      if (res.success) {
        toast(`Branch status updated to ${newStatus}`);
        loadConsolidatedReport();
      }
    } catch (err) {
      toast(err.message || 'Error updating status', 'error');
    }
  };

  const handleLoginAsAdmin = (branch) => {
    if (!branch || !branch.branchId) return;
    // switchBranch handles: localStorage, cache clear, activeBranch state, and navigation to /dashboard
    switchBranch(branch.branchId);
  };

  const handleOpenDeleteModal = async (branch) => {
    setDeleteModalBranch(branch);
    setTypedBranchCode('');
    setSuperAdminPass('');
    setDeleteSafetyData(null);
    setLoadingSafety(true);

    try {
      const res = await api.get(`/super-admin/branches/${branch.branchId}/safety-check`);
      if (res.success && res.data) {
        setDeleteSafetyData(res.data);
      }
    } catch (err) {
      console.warn('Could not inspect safety data:', err.message);
    } finally {
      setLoadingSafety(false);
    }
  };

  const handleExecuteDeleteBranch = async (actionType = 'purge') => {
    if (!deleteModalBranch) return;

    if (actionType === 'purge') {
      if (typedBranchCode.trim().toUpperCase() !== deleteModalBranch.branchCode.trim().toUpperCase()) {
        toast(`Please type exact branch code "${deleteModalBranch.branchCode}" to confirm.`, 'error');
        return;
      }
      if (!superAdminPass) {
        toast('Please enter your Super Admin password to authorize deletion.', 'error');
        return;
      }
    }

    setDeletingBranch(true);
    try {
      const payload = {
        confirmBranchCode: deleteModalBranch.branchCode,
        superAdminPassword: superAdminPass,
        action: actionType
      };

      const res = await api.post(`/super-admin/branches/${deleteModalBranch.branchId}/delete`, payload);
      if (res.success) {
        toast(res.message || 'Branch processed successfully.');
        setDeleteModalBranch(null);
        loadConsolidatedReport();
      }
    } catch (err) {
      toast(err.message || 'Branch deletion failed.', 'error');
    } finally {
      setDeletingBranch(false);
    }
  };

  const handleSaveEditBranch = async (e) => {
    e.preventDefault();
    if (!editModalBranch) return;

    setSavingEdit(true);
    try {
      const res = await api.put(`/super-admin/branches/${editModalBranch.branchId}`, editForm);
      if (res.success) {
        toast('Branch profile updated successfully');
        setEditModalBranch(null);
        loadConsolidatedReport();
      }
    } catch (err) {
      toast(err.message || 'Error updating profile', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalBranch || !newAdminPass) return;

    setSavingPass(true);
    try {
      const res = await api.post(`/super-admin/branches/${resetModalBranch.branchId}/reset-admin-password`, {
        newPassword: newAdminPass
      });
      if (res.success) {
        toast(res.message || 'Admin password reset successfully');
        setResetModalBranch(null);
        setNewAdminPass('');
        if (activeTab === 'audit_security') loadBranchAdmins();
      }
    } catch (err) {
      toast(err.message || 'Error resetting password', 'error');
    } finally {
      setSavingPass(false);
    }
  };

  const handleUpdateMasterPassword = async (e) => {
    e.preventDefault();
    if (!currentMasterPass || !newMasterPass) {
      toast('Please enter both current and new password', 'error');
      return;
    }
    if (newMasterPass.length < 8) {
      toast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newMasterPass !== confirmMasterPass) {
      toast('New password and confirmation do not match', 'error');
      return;
    }

    setUpdatingMasterPass(true);
    try {
      const res = await api.put('/super-admin/security/password', {
        currentPassword: currentMasterPass,
        newPassword: newMasterPass
      });
      if (res.success) {
        toast('Master Super Admin password updated successfully!');
        setCurrentMasterPass('');
        setNewMasterPass('');
        setConfirmMasterPass('');
      }
    } catch (err) {
      toast(err.message || 'Error updating password', 'error');
    } finally {
      setUpdatingMasterPass(false);
    }
  };

  const { combined = {}, branches = [] } = reportData || {};
  const isMaxReached = (branches.length >= 2);

  return (
    <div className="space-y-4">

      {/* Hero Banner */}
      <div className="hero p-5 rounded-2xl bg-gradient-to-r from-white via-blue-50/40 to-blue-100/40 border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight m-0">
            {activeTab === 'overview' && 'Platform Branch Summary'}
            {activeTab === 'branches' && 'Branch Registry & Infrastructure'}
            {activeTab === 'delete_branch' && 'Delete Branch Infrastructure'}
            {activeTab === 'reports' && 'Comparative Branch Reports'}
            {activeTab === 'audit_security' && 'Platform Audit & Security'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Welcome, <strong>{user?.name || 'Super Administrator'}</strong>. Central multi-database oversight & aggregated real-time metrics.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>

          {!isMaxReached && (
            <Link
              href="/super-admin/branches/new"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle size={13} />
              <span>+ Open New Branch</span>
            </Link>
          )}

          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            onClick={() => { logout(); router.push('/'); }}
            title="Sign out of Platform Super Admin"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (for Summary and Reports) */}
      {(activeTab === 'overview' || activeTab === 'reports') && (
        <div className="panel p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-slate-500" />
              <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Scope & Date Filters
              </strong>
            </div>
            <span className="badge success text-2xs">
              {selectedBranch === 'all' ? 'Scope: All Branches Combined' : `Scope: Branch ${selectedBranch}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Branch Scope</label>
              <select className="input" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="all">All Branches (Combined)</option>
                {branches.map(b => (
                  <option key={b.branchId} value={String(b.branchId)}>
                    {b.branchCode}: {b.branchName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Date Range</label>
              <select className="input" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                <option value="all_time">All Time</option>
                <option value="today">Today</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">From Date</label>
                  <input className="input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">To Date</label>
                  <input className="input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
              </>
            )}

            <div className="flex gap-2">
              {(dateFilter !== 'all_time' || selectedBranch !== 'all') && (
                <button
                  type="button"
                  className="btn btn-ghost text-xs inline-flex items-center gap-1.5"
                  onClick={() => { setDateFilter('all_time'); setFromDate(''); setToDate(''); setSelectedBranch('all'); }}
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. BRANCH SUMMARY VIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Revenue & Profitability (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="TOTAL SALES REVENUE"
              value={money(combined.totalSales)}
              sub="Gross retail sales volume"
              badge={`${combined.salesCount || 0} Bills`}
              icon="receipt"
              loading={loading}
            />
            <StatCard
              label="GROSS PROFIT"
              value={money(combined.grossProfit)}
              sub={`COGS: ${money(combined.totalCogs)}`}
              badge={`Margin: ${combined.grossMarginPercent || 0}%`}
              icon="chart"
              loading={loading}
            />
            <StatCard
              label="NET PROFIT"
              value={money(combined.netProfit)}
              sub="After all operating expenses"
              badge={`Net: ${combined.netMarginPercent || 0}%`}
              icon="wallet"
              loading={loading}
            />
            <StatCard
              label="OPERATING EXPENSES"
              value={money(combined.totalExpenses)}
              sub={`Cash: ${money(combined.cashExpenses)}`}
              badge={`Bank: ${money(combined.onlineExpenses)}`}
              icon="banknote"
              loading={loading}
            />
          </div>

          {/* Operations & Liquidity (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="REPAIR REVENUE"
              value={money(combined.repairRevenue)}
              sub="Delivered & closed repairs"
              badge={`${combined.activeRepairs || 0} Active`}
              icon="wrench"
              loading={loading}
            />
            <StatCard
              label="CASH IN DRAWER"
              value={money(combined.cashInDrawer)}
              sub="Physical registers cash"
              badge="Ready Cash"
              icon="wallet"
              loading={loading}
            />
            <StatCard
              label="ONLINE / BANK BALANCE"
              value={money(combined.onlineBalance)}
              sub="Digital & bank accounts"
              badge="Bank Liquidity"
              icon="monitor"
              loading={loading}
            />
            <StatCard
              label="INVENTORY VALUATION"
              value={money(combined.stockCostValue)}
              sub={`${combined.totalStockItems || 0} stock units`}
              badge={combined.lowStockCount > 0 ? `${combined.lowStockCount} Low Stock` : 'Healthy'}
              icon="boxes"
              loading={loading}
            />
          </div>

          {/* Working Capital Balances (2 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <StatCard
              label="CUSTOMER RECEIVABLES (UDHAAR)"
              value={money(combined.customerReceivables)}
              sub="Pending customer balances across all accounts"
              badge="Outstanding"
              icon="users"
              loading={loading}
            />
            <StatCard
              label="VENDOR PAYABLES"
              value={money(combined.vendorPayables)}
              sub="Pending supplier invoices and purchase balances"
              badge="Liabilities"
              icon="truck"
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ── 2. BRANCH LIST VIEW ── */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="panel p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Registered Operational Branches
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Independent PostgreSQL physical database running for each registered facility.
                </p>
              </div>
              <span className="badge primary text-2xs">
                {branches.length} / 2 Provisioned Branches
              </span>
            </div>
          </div>

          {/* Clean Modern Branch Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(b => (
              <div
                key={b.branchId}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                {/* Header: Name, ID, and Status */}
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="badge primary font-bold text-xs px-2 py-0.5 shrink-0">{b.branchCode}</span>
                    <h3 className="text-base font-bold text-slate-900 m-0 truncate">{b.branchName}</h3>
                  </div>
                  <span className={`badge ${b.status === 'Active' ? 'success' : 'danger'} text-2xs shrink-0`}>
                    {b.status}
                  </span>
                </div>

                {/* Clean Action Buttons Bar */}
                <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      onClick={() => setViewDetailsBranch(b)}
                    >
                      <Eye size={13} className="text-slate-500" />
                      <span>View</span>
                    </button>

                    {/* Active / Inactive Toggle Button */}
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        b.status === 'Active'
                          ? 'text-slate-600 bg-white hover:bg-slate-50 border-slate-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                      onClick={() => handleToggleStatus(b.branchId, b.status)}
                    >
                      <Power size={12} />
                      <span>{b.status === 'Active' ? 'Inactive' : 'Active'}</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 inline-flex items-center gap-1 transition-all cursor-pointer"
                      onClick={() => handleOpenDeleteModal(b)}
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Login as Admin */}
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    onClick={() => handleLoginAsAdmin(b)}
                  >
                    <LogIn size={13} />
                    <span>Login as Admin →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Max Reached Callout */}
          {isMaxReached && (
            <div className="panel p-4 text-center text-xs text-slate-500">
              Maximum 2 branches registered. Both operational databases are online.
            </div>
          )}
        </div>
      )}

      {/* ── 3. DEDICATED DELETE BRANCH VIEW ── */}
      {activeTab === 'delete_branch' && (
        <div className="space-y-4">
          <div className="panel p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Branch Decommission & Deletion
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently remove or decommission secondary branch database infrastructure.
                </p>
              </div>
              <span className="badge text-2xs bg-red-50 text-red-700 border border-red-200">
                Super Admin Master Control
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Branch Code</th>
                    <th>Branch Name</th>
                    <th>City</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => {
                    const isSoleBranch = branches.length <= 1;
                    return (
                      <tr key={b.branchId}>
                        <td><span className="badge primary font-bold text-2xs">{b.branchCode}</span></td>
                        <td><strong>{b.branchName}</strong></td>
                        <td>{b.city || '—'}</td>
                        <td>{b.adminName || 'Manager'} (<code>{b.adminUsername || 'admin'}</code>)</td>
                        <td>
                          <span className={`badge ${b.status === 'Active' ? 'success' : 'danger'} text-2xs`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            onClick={() => handleOpenDeleteModal(b)}
                          >
                            <Trash2 size={13} />
                            <span>Delete Branch</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. BRANCH REPORTS VIEW ── */}
      {activeTab === 'reports' && (
        <div className="panel p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Comparative Multi-Branch Financial Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side calculated metrics queried live from physical PostgreSQL databases.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="text-left">Financial / Operational KPI</th>
                  {branches.map(b => (
                    <th key={b.branchId} className="text-right">
                      {b.branchCode}: {b.branchName}
                    </th>
                  ))}
                  <th className="text-right bg-emerald-50 text-emerald-900 font-bold">
                    Combined Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold">1. Total Sales Revenue</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.totalSales)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.totalSales)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">2. Invoice Count</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{b.salesCount || 0} bills</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{combined.salesCount || 0} bills</td>
                </tr>
                <tr>
                  <td className="font-semibold">3. Repair Revenue</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.repairRevenue)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.repairRevenue)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">4. Active Repairs</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{b.activeRepairs || 0} jobs</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{combined.activeRepairs || 0} jobs</td>
                </tr>
                <tr>
                  <td className="font-semibold">5. COGS (Cost of Goods)</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right text-red-600">{money(b.totalCogs)}</td>
                  ))}
                  <td className="text-right font-bold text-red-600 bg-emerald-50/60">{money(combined.totalCogs)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">6. Gross Profit</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right text-emerald-700 font-bold">
                      {money(b.grossProfit)} ({b.grossMarginPercent}%)
                    </td>
                  ))}
                  <td className="text-right font-bold text-emerald-700 bg-emerald-50/60">
                    {money(combined.grossProfit)} ({combined.grossMarginPercent}%)
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">7. Operating Expenses</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right text-amber-700">{money(b.totalExpenses)}</td>
                  ))}
                  <td className="text-right font-bold text-amber-700 bg-emerald-50/60">{money(combined.totalExpenses)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td>8. Net Profit</td>
                  {branches.map(b => (
                    <td key={b.branchId} className={`text-right ${b.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {money(b.netProfit)} ({b.netMarginPercent}%)
                    </td>
                  ))}
                  <td className={`text-right bg-emerald-50/90 ${combined.netProfit >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>
                    {money(combined.netProfit)} ({combined.netMarginPercent}%)
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">9. Cash in Drawer</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.cashInDrawer)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.cashInDrawer)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">10. Online Bank Balance</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.onlineBalance)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.onlineBalance)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">11. Customer Receivables</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.customerReceivables)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.customerReceivables)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">12. Vendor Payables</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.vendorPayables)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.vendorPayables)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">13. Stock Valuation</td>
                  {branches.map(b => (
                    <td key={b.branchId} className="text-right">{money(b.stockCostValue)}</td>
                  ))}
                  <td className="text-right font-bold bg-emerald-50/60">{money(combined.stockCostValue)}</td>
                </tr>
                <tr>
                  <td className="font-semibold">14. Low Stock SKUs</td>
                  {branches.map(b => (
                    <td key={b.branchId} className={`text-right ${b.lowStockCount > 0 ? 'text-red-600 font-bold' : ''}`}>
                      {b.lowStockCount || 0} items
                    </td>
                  ))}
                  <td className={`text-right font-bold bg-emerald-50/60 ${combined.lowStockCount > 0 ? 'text-red-600' : ''}`}>
                    {combined.lowStockCount || 0} items
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. AUDIT & SECURITY VIEW ── */}
      {activeTab === 'audit_security' && (
        <div className="space-y-5">
          {/* Master Audit Trail */}
          <div className="panel p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Immutable Master Audit Logs</h3>
                <p className="text-xs text-slate-500 mt-0.5">Central security audit events recorded directly in master database.</p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                onClick={loadAuditLogs}
                disabled={loadingLogs}
              >
                <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} /> Refresh Logs
              </button>
            </div>

            {loadingLogs ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No audit events recorded yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Scope</th>
                      <th>Details</th>
                      <th>Performed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td><span className="badge success text-2xs">{log.action}</span></td>
                        <td>{log.branch_code ? `${log.branch_code}: ${log.branch_name}` : 'Central Platform'}</td>
                        <td className="max-w-xs truncate text-xs">
                          <code>{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</code>
                        </td>
                        <td><strong>{log.performed_by || 'superadmin'}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Branch Admin Accounts */}
          <div className="panel p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Branch Administrator Accounts</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage and reset operational passwords for branch managers.</p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                onClick={loadBranchAdmins}
                disabled={loadingAdmins}
              >
                <RefreshCw size={12} className={loadingAdmins ? 'animate-spin' : ''} /> Refresh Admins
              </button>
            </div>

            {loadingAdmins ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading administrators...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Admin Name</th>
                      <th>Username</th>
                      <th>Designation</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchAdminsList.flatMap(ba => (
                      (ba.admins || []).map(adm => (
                        <tr key={ba.branchId + '_' + adm.id}>
                          <td><strong>{ba.branchCode}: {ba.branchName}</strong></td>
                          <td><strong>{adm.name}</strong></td>
                          <td><code>{adm.username}</code></td>
                          <td>{adm.designation || 'Branch Administrator'}</td>
                          <td>
                            <span className={`badge ${adm.status === 'Active' ? 'success' : 'danger'} text-2xs`}>
                              {adm.status}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1 cursor-pointer"
                              onClick={() => setResetModalBranch({ branchId: ba.branchId, branchCode: ba.branchCode, branchName: ba.branchName })}
                            >
                              <Key size={12} /> Reset Password
                            </button>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Master Password Update */}
          <div className="panel p-5 max-w-lg space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">Change Master Super Admin Password</h3>
              <p className="text-xs text-slate-500 mt-0.5">Updates the master password in central database (<code>master_super_admins</code>).</p>
            </div>

            <form onSubmit={handleUpdateMasterPassword} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Current Password *</label>
                <input
                  type="password"
                  className="input"
                  value={currentMasterPass}
                  onChange={e => setCurrentMasterPass(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">New Password (Min 8 characters) *</label>
                <input
                  type="password"
                  className="input"
                  value={newMasterPass}
                  onChange={e => setNewMasterPass(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  className="input"
                  value={confirmMasterPass}
                  onChange={e => setConfirmMasterPass(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 cursor-pointer"
                  disabled={updatingMasterPass}
                >
                  {updatingMasterPass ? 'Updating...' : 'Update Master Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 1: VIEW DETAILS MODAL ── */}
      {viewDetailsBranch && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                <h3 className="m-0 text-sm font-bold">Branch Profile: {viewDetailsBranch.branchName} ({viewDetailsBranch.branchCode})</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setViewDetailsBranch(null)}>×</button>
            </div>
            <div className="modal-body space-y-3">
              {/* Status Banner */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-xs text-slate-500 block">Operational Status</span>
                  <strong className={`text-xs ${viewDetailsBranch.status === 'Active' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {viewDetailsBranch.status}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">System State</span>
                  <span className="badge success text-2xs">Synchronized & Active</span>
                </div>
              </div>

              {/* Business Profile Details */}
              <div>
                <strong className="text-xs text-slate-700 block mb-1.5">Branch Profile & Operational Details</strong>
                <div className="grid grid-cols-2 gap-2.5 text-xs bg-white border border-slate-200/80 rounded-xl p-3.5">
                  <div><span>Branch Code:</span> <strong className="block font-bold text-blue-700">{viewDetailsBranch.branchCode}</strong></div>
                  <div><span>Branch Name:</span> <strong className="block font-semibold">{viewDetailsBranch.branchName}</strong></div>
                  <div><span>Branch Manager:</span> <strong className="block">{viewDetailsBranch.adminName || '—'}</strong></div>
                  <div><span>Admin Username:</span> <strong className="block"><code>{viewDetailsBranch.adminUsername || '—'}</code></strong></div>
                  <div><span>City:</span> <strong className="block">{viewDetailsBranch.city || '—'}</strong></div>
                  <div><span>Phone:</span> <strong className="block">{viewDetailsBranch.phone || '—'}</strong></div>
                  <div><span>Email:</span> <strong className="block">{viewDetailsBranch.email || '—'}</strong></div>
                  <div><span>Registration Date:</span> <strong className="block">{fmtDate(viewDetailsBranch.createdAt)}</strong></div>
                  <div className="col-span-2"><span>Physical Address:</span> <strong className="block">{viewDetailsBranch.address || '—'}</strong></div>
                </div>
              </div>
            </div>
            <div className="modal-foot flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-1.5">
                <button type="button" className="btn small" onClick={() => setViewDetailsBranch(null)}>Close</button>
                <button
                  type="button"
                  className="btn small inline-flex items-center gap-1"
                  onClick={() => {
                    const b = viewDetailsBranch;
                    setViewDetailsBranch(null);
                    setEditModalBranch(b);
                    setEditForm({
                      branch_name: b.branchName || '',
                      phone: b.phone || '',
                      email: b.email || '',
                      city: b.city || '',
                      address: b.address || '',
                      admin_name: b.adminName || ''
                    });
                  }}
                >
                  <Edit3 size={12} /> Edit Details
                </button>
              </div>

              <button
                type="button"
                className="btn small primary inline-flex items-center gap-1.5"
                onClick={() => {
                  const b = viewDetailsBranch;
                  setViewDetailsBranch(null);
                  handleLoginAsAdmin(b);
                }}
              >
                <LogIn size={13} /> Login as Admin in {viewDetailsBranch.branchCode} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT BRANCH MODAL ── */}
      {editModalBranch && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h3 className="m-0 text-sm font-bold">Edit Branch ({editModalBranch.branchCode})</h3>
              <button type="button" className="modal-close" onClick={() => setEditModalBranch(null)}>×</button>
            </div>
            <form onSubmit={handleSaveEditBranch}>
              <div className="modal-body space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Branch Name *</label>
                  <input className="input" value={editForm.branch_name} onChange={e => setEditForm({ ...editForm, branch_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">City</label>
                    <input className="input" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Phone</label>
                    <input className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
                  <input className="input" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Address</label>
                  <input className="input" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
              </div>
              <div className="modal-foot flex justify-end gap-2">
                <button type="button" className="btn small" onClick={() => setEditModalBranch(null)}>Cancel</button>
                <button type="submit" className="btn small primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: RESET ADMIN PASSWORD MODAL ── */}
      {resetModalBranch && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h3 className="m-0 text-sm font-bold">Reset Admin Password</h3>
              <button type="button" className="modal-close" onClick={() => setResetModalBranch(null)}>×</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body space-y-3">
                <p className="text-xs text-slate-500 m-0">
                  Resetting credentials for manager of <strong>{resetModalBranch.branchName} ({resetModalBranch.branchCode})</strong>.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">New Password (Min 6 chars) *</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={newAdminPass}
                    onChange={e => setNewAdminPass(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="modal-foot flex justify-end gap-2">
                <button type="button" className="btn small" onClick={() => setResetModalBranch(null)}>Cancel</button>
                <button type="submit" className="btn small primary" disabled={savingPass || !newAdminPass}>
                  {savingPass ? 'Resetting...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE BRANCH MODAL ── */}
      {deleteModalBranch && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head bg-red-50/80 border-b border-red-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 grid place-items-center">
                  <AlertTriangle size={15} />
                </div>
                <h3 className="m-0 text-sm font-bold text-red-900">
                  Delete {deleteModalBranch.branchName} ({deleteModalBranch.branchCode})
                </h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setDeleteModalBranch(null)}>×</button>
            </div>

            <div className="modal-body space-y-3">
              <div className="bg-red-50/80 border border-red-200 rounded-xl p-3 text-xs text-red-800 leading-relaxed">
                <strong>Warning:</strong> All records, database data, and staff access for <strong>{deleteModalBranch.branchCode}</strong> will be permanently deleted.
              </div>

              {deleteSafetyData?.hasFinancialRecords && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex justify-between items-center gap-2">
                  <span className="text-2xs text-amber-900 font-semibold">Or deactivate to keep records:</span>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-800 bg-white hover:bg-amber-100 border border-amber-200 cursor-pointer"
                    onClick={() => handleExecuteDeleteBranch('archive')}
                    disabled={deletingBranch}
                  >
                    Archive Instead
                  </button>
                </div>
              )}

              <div className="space-y-2.5 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    1. Type <code>{deleteModalBranch.branchCode}</code> to confirm:
                  </label>
                  <input
                    className="input font-bold tracking-wider"
                    placeholder={deleteModalBranch.branchCode}
                    value={typedBranchCode}
                    onChange={e => setTypedBranchCode(e.target.value.toUpperCase())}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    2. Super Admin Password:
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter master password"
                    value={superAdminPass}
                    onChange={e => setSuperAdminPass(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-foot flex justify-between items-center">
              <button
                type="button"
                className="btn small"
                onClick={() => setDeleteModalBranch(null)}
                disabled={deletingBranch}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn small danger inline-flex items-center gap-1.5"
                onClick={() => handleExecuteDeleteBranch('purge')}
                disabled={
                  deletingBranch ||
                  typedBranchCode.trim().toUpperCase() !== deleteModalBranch.branchCode.trim().toUpperCase() ||
                  !superAdminPass
                }
              >
                {deletingBranch ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
