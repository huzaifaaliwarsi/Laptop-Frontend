'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import ExpenseModal from '../../components/modules/expenses/ExpenseModal';
import { useToast } from '../../components/common/Toast';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const loadExpenses = () => {
    setLoading(true);
    let url = '/expenses?';
    if (categoryFilter) url += `categoryName=${encodeURIComponent(categoryFilter)}&`;
    if (methodFilter) url += `paymentMethod=${encodeURIComponent(methodFilter)}&`;
    if (fromDate) url += `from=${encodeURIComponent(fromDate)}&`;
    if (toDate) url += `to=${encodeURIComponent(toDate)}&`;

    Promise.all([
      api.get(url),
      api.get('/categories')
    ]).then(([eRes, cRes]) => {
      if (eRes.success) setExpenses(eRes.data || []);
      if (cRes.success) setCategories(cRes.data.expenseCategories || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter, methodFilter, fromDate, toDate]);

  const handleDelete = async (exp) => {
    if (!confirm(`Delete expense "${exp.description}" for PKR ${exp.amount}?`)) return;
    try {
      const res = await api.delete(`/expenses/${exp.id}`);
      if (res.success) {
        toast('Expense deleted');
        loadExpenses();
      }
    } catch (err) {
      toast(err.message || 'Error deleting expense', 'error');
    }
  };

  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const cashExpense = expenses.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + (e.amount || 0), 0);
  const onlineExpense = expenses.filter(e => e.paymentMethod === 'Online').reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>TOTAL EXPENSES</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 grid place-items-center">
              <Icon name="banknote" />
            </span>
          </div>
          <div className="stat-value text-2xl font-extrabold text-slate-900 mt-2.5 tracking-tight">{money(totalExpense)}</div>
          <div className="stat-note text-xs text-slate-400 mt-1">{expenses.length} expense entries recorded</div>
        </div>

        <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>CASH OUTFLOW</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center">
              <Icon name="wallet" />
            </span>
          </div>
          <div className="stat-value text-2xl font-extrabold text-slate-900 mt-2.5 tracking-tight">{money(cashExpense)}</div>
          <div className="stat-note text-xs text-slate-400 mt-1">Paid from cash drawer</div>
        </div>

        <div className="stat bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="stat-top flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>ONLINE OUTFLOW</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center">
              <Icon name="creditCard" />
            </span>
          </div>
          <div className="stat-value text-2xl font-extrabold text-slate-900 mt-2.5 tracking-tight">{money(onlineExpense)}</div>
          <div className="stat-note text-xs text-slate-400 mt-1">Paid via online bank transfer</div>
        </div>
      </div>

      {/* Main Expenses Table Panel */}
      <div className="panel bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="panel-head p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
          <div className="toolbar flex gap-2.5 flex-wrap items-center flex-1">
            <select
              className="select min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              style={{ width: 180 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Expense Categories</option>
              {categories.map(c => (
                <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>
              ))}
            </select>

            <select
              className="select min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              style={{ width: 140 }}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="Cash">Cash Only</option>
              <option value="Online">Online Only</option>
            </select>

            <input
              className="input min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="date"
              style={{ width: 140 }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
            />
            <input
              className="input min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="date"
              style={{ width: 140 }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
            />
          </div>

          <button
            type="button"
            className="btn primary px-4 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
            onClick={() => setIsAddOpen(true)}
          >
            <Icon name="plus" /> + Record Expense
          </button>
        </div>

        <div className="panel-body p-0">
          <div className="table-wrap w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-3">Expense ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Recorded By</th>
                  <th className="p-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-slate-400">
                      Loading expense records...
                    </td>
                  </tr>
                ) : expenses.length > 0 ? (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{exp.id}</td>
                      <td className="p-3 text-slate-600">{fmtDate(exp.date)}</td>
                      <td className="p-3">
                        <span className="badge px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-800">{exp.description}</strong>
                        {exp.linkedTrackingId && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Job: {exp.linkedTrackingId}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-600">{exp.paymentMethod}</td>
                      <td className="p-3 text-slate-500">{exp.referenceId || '—'}</td>
                      <td className="p-3 text-right font-extrabold text-rose-600">
                        {money(exp.amount)}
                      </td>
                      <td className="p-3 text-slate-600">{exp.createdByName || 'Staff'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            className="icon-action w-7 h-7 rounded-lg border border-slate-200 grid place-items-center hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
                            onClick={() => setEditingExpense(exp)}
                            title="Edit Expense"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="icon-action w-7 h-7 rounded-lg border border-slate-200 grid place-items-center hover:bg-rose-50 hover:text-rose-600 text-rose-500 transition-colors cursor-pointer"
                            onClick={() => handleDelete(exp)}
                            title="Delete Expense"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-slate-400">
                      No expenses found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ExpenseModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => loadExpenses()}
      />

      <ExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        onSuccess={() => loadExpenses()}
      />
    </div>
  );
}
