'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import Modal from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function VendorsPage() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadVendors = () => {
    setLoading(true);
    let url = '/vendors';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    api.get(url)
      .then(res => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVendors();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setName('');
    setContact('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setName(v.name);
    setContact(v.contact || '');
    setAddress(v.address || '');
    setNotes(v.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Vendor name is required', 'error');
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
      if (editingVendor) {
        res = await api.put(`/vendors/${editingVendor.id}`, payload);
      } else {
        res = await api.post('/vendors', payload);
      }

      if (res.success) {
        toast(`Vendor ${editingVendor ? 'updated' : 'added'} successfully!`);
        setIsModalOpen(false);
        loadVendors();
      }
    } catch (err) {
      toast(err.message || 'Error saving vendor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Delete vendor ${v.name}?`)) return;
    try {
      const res = await api.delete(`/vendors/${v.id}`);
      if (res.success) {
        toast('Vendor profile deleted');
        loadVendors();
      }
    } catch (err) {
      toast(err.message || 'Error deleting vendor', 'error');
    }
  };

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <input
              className="input search"
              style={{ maxWidth: 320 }}
              placeholder="Search vendor name, contact, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="btn primary" onClick={handleOpenAdd}>
              <Icon name="plus" /> + Add New Vendor
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Vendor Name</th>
                  <th>Contact Number</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'right' }}>Open Payable</th>
                  <th style={{ textAlign: 'right' }}>Open Receivable</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      Loading vendor directory...
                    </td>
                  </tr>
                ) : vendors.length > 0 ? (
                  vendors.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.id}</strong></td>
                      <td><strong>{v.name}</strong></td>
                      <td>{v.contact || '—'}</td>
                      <td>{v.address || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: v.openPayable > 0 ? 'var(--danger)' : 'var(--text)' }}>
                        {money(v.openPayable)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: v.openReceivable > 0 ? 'var(--success)' : 'var(--text)' }}>
                        {money(v.openReceivable)}
                      </td>
                      <td style={{ fontSize: 10, color: 'var(--muted)' }}>{v.notes || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <Link
                            href={`/ledger?partyType=vendor&partyId=${v.id}`}
                            className="btn small"
                            title="Party Ledger"
                          >
                            Ledger
                          </Link>
                          <button
                            type="button"
                            className="icon-action"
                            onClick={() => handleOpenEdit(v)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="icon-action"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(v)}
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
                      No vendors registered yet.
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
        title={editingVendor ? "Edit Vendor Profile" : "Add New Vendor / Supplier"}
        subtitle="Maintain vendor contact and payable balances"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="vendorForm"
              className="btn primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Vendor'}
            </button>
          </>
        }
      >
        <form id="vendorForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field span-6">
              <label>Vendor / Supplier Name *</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Al-Madina Computers"
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
              <label>Shop / Office Address</label>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plaza #, Market Name, City"
              />
            </div>
            <div className="field span-12">
              <label>Notes / Terms</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Credit terms, warranty agreements"
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
