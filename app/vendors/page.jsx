'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import Modal from '../../components/common/Modal';
import { TableRowSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';

const VendorGroupPaymentModal = dynamic(() => import('../../components/modules/accounts/VendorGroupPaymentModal'), { ssr: false });

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

  // Group Payment Modal
  const [isGroupPaymentOpen, setIsGroupPaymentOpen] = useState(false);
  const [groupPaymentVendor, setGroupPaymentVendor] = useState(null);

  const loadVendors = () => {
    setLoading(true);
    let url = '/vendors';
    if (search && search.trim()) url += `?search=${encodeURIComponent(search.trim())}`;
    api.get(url)
      .then(res => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadVendors();
    }, 250);
    return () => clearTimeout(timer);
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
          <div className="toolbar" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <input
              className="input search"
              style={{ maxWidth: 320 }}
              placeholder="Search vendor name, contact, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                style={{ background: '#059669', color: '#fff', borderColor: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setGroupPaymentVendor(null);
                  setIsGroupPaymentOpen(true);
                }}
              >
                <Icon name="creditCard" /> + Group Payment
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="plus" /> + Add New Vendor
              </button>
            </div>
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
                  <TableRowSkeleton cols={8} rows={6} />
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
                          {parseFloat(v.openPayable || 0) > 0 && (
                            <button
                              type="button"
                              className="btn small"
                              style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontWeight: 700 }}
                              title="Make Group Payment to Vendor"
                              onClick={() => {
                                setGroupPaymentVendor(v);
                                setIsGroupPaymentOpen(true);
                              }}
                            >
                              Pay
                            </button>
                          )}
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

      <VendorGroupPaymentModal
        isOpen={isGroupPaymentOpen}
        vendor={groupPaymentVendor}
        onClose={() => {
          setIsGroupPaymentOpen(false);
          setGroupPaymentVendor(null);
        }}
        onSuccess={loadVendors}
      />
    </>
  );
}
