'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import Modal from '../../components/common/Modal';
import { TableRowSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = () => {
    setLoading(true);
    let url = '/customers?';
    if (search && search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;
    if (balanceFilter) url += `balance=${encodeURIComponent(balanceFilter)}&`;
    api.get(url)
      .then(res => {
        if (res.success) setCustomers(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, balanceFilter]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setContact('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setName(c.name);
    setContact(c.contact || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Customer name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        address: address.trim(),
        notes: notes.trim()
      };

      let res;
      if (editingCustomer) {
        res = await api.put(`/customers/${editingCustomer.id}`, payload);
      } else {
        res = await api.post('/customers', payload);
      }

      if (res.success) {
        toast(`Customer ${editingCustomer ? 'updated' : 'added'} successfully!`);
        setIsModalOpen(false);
        loadCustomers();
      }
    } catch (err) {
      toast(err.message || 'Error saving customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete customer profile ${c.name}?`)) return;
    try {
      const res = await api.delete(`/customers/${c.id}`);
      if (res.success) {
        toast('Customer profile deleted');
        loadCustomers();
      }
    } catch (err) {
      toast(err.message || 'Error deleting customer', 'error');
    }
  };

  // Client-side quick filter for instantaneous responsiveness
  const displayCustomers = customers.filter(c => {
    if (!c) return false;
    const q = search.trim().toLowerCase();
    const matchQ = !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.contact && c.contact.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    let matchBal = true;
    const rec = parseFloat(c.openReceivable || c.receivable || 0);
    const pay = parseFloat(c.openPayable || c.payable || 0);
    if (balanceFilter === 'receivable') {
      matchBal = rec > 0;
    } else if (balanceFilter === 'payable') {
      matchBal = pay > 0;
    } else if (balanceFilter === 'zero') {
      matchBal = rec === 0 && pay === 0;
    }

    return matchQ && matchBal;
  });

  const totalReceivable = displayCustomers.reduce((sum, c) => sum + parseFloat(c.openReceivable || c.receivable || 0), 0);
  const totalPayable = displayCustomers.reduce((sum, c) => sum + parseFloat(c.openPayable || c.payable || 0), 0);

  return (
    <>
      {/* Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="stat bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Customers</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{customers.length} Profiles</div>
        </div>
        <div className="stat bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Total Udhaar / Receivables</div>
          <div className="text-xl font-bold text-rose-600 mt-1">{money(totalReceivable)}</div>
        </div>
        <div className="stat bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Customer Credits / Payables</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{money(totalPayable)}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
              <input
                className="input search"
                style={{ flex: 1, maxWidth: 360 }}
                placeholder="Search name, phone, address, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                style={{ width: 190 }}
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
              >
                <option value="">All Balances</option>
                <option value="receivable">With Udhaar (Receivable)</option>
                <option value="payable">With Credit (Payable)</option>
                <option value="zero">Clear Balance (Rs 0)</option>
              </select>
              {(search || balanceFilter) && (
                <button
                  type="button"
                  className="btn small"
                  onClick={() => { setSearch(''); setBalanceFilter(''); }}
                  title="Clear Filters"
                >
                  Clear
                </button>
              )}
            </div>
            <button type="button" className="btn primary" onClick={handleOpenAdd}>
              <Icon name="plus" /> + Add New Customer
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Customer Name</th>
                  <th>Contact Number</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'right' }}>Open Receivable</th>
                  <th style={{ textAlign: 'right' }}>Open Payable</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && displayCustomers.length === 0 ? (
                  <TableRowSkeleton cols={8} rows={6} />
                ) : displayCustomers.length > 0 ? (
                  displayCustomers.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.id}</strong></td>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.contact || '—'}</td>
                      <td>{c.address || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: (c.openReceivable || c.receivable) > 0 ? 'var(--danger)' : 'var(--text)' }}>
                        {money(c.openReceivable || c.receivable)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: (c.openPayable || c.payable) > 0 ? 'var(--success)' : 'var(--text)' }}>
                        {money(c.openPayable || c.payable)}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{c.notes || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <Link
                            href={`/ledger?partyType=customer&partyId=${c.id}`}
                            className="btn small"
                            title="Party Ledger"
                          >
                            Ledger
                          </Link>
                          <button
                            type="button"
                            className="icon-action"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="icon-action"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(c)}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No customers matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? "Edit Customer Profile" : "Add New Customer Profile"}
        subtitle="Manage customer contact and balance registers"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="customerForm"
              className="btn primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Customer'}
            </button>
          </>
        }
      >
        <form id="customerForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field span-6">
              <label>Customer Full Name *</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Usman Ghani"
                required
              />
            </div>
            <div className="field span-6">
              <label>Contact Phone</label>
              <input
                className="input"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="03001234567"
              />
            </div>
            <div className="field span-12">
              <label>Address / City</label>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street / Area / City"
              />
            </div>
            <div className="field span-12">
              <label>Customer Notes</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes or preferences"
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
