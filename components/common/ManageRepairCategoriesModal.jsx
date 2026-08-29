'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import Modal from './Modal';
import { TableRowSkeleton } from './Skeleton';
import { useToast } from './Toast';
import api from '../../services/api';

export default function ManageRepairCategoriesModal({
  isOpen,
  onClose,
  selectedCategoryId = null,
  selectedCategoryName = '',
  onSelectCategory,
  onCategoriesUpdated
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories/repair');
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
        if (onCategoriesUpdated) {
          onCategoriesUpdated(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching repair categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast('Please enter a repair category name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: cleanName,
        description: description.trim() || null,
        isActive: true
      };

      const res = await api.post('/categories/repair', payload);
      if (res.success && res.data) {
        toast(`Repair category "${res.data.name}" added successfully!`);
        setName('');
        setDescription('');
        
        // 1. Select the new category immediately
        if (onSelectCategory) {
          onSelectCategory(res.data);
        }

        // 2. Broadcast event to entire app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:repair-categories-updated', { detail: res.data }));
        }

        // 3. Auto-close modal so user sees it selected
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Failed to add repair category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const repairCount = parseInt(cat.repairCount || 0, 10);
    if (repairCount > 0) {
      toast(`Cannot delete "${cat.name}" because it is linked to ${repairCount} repair job(s)`, 'error');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete repair category "${cat.name}" from PostgreSQL database?`)) {
      return;
    }

    setDeletingId(cat.id);
    try {
      const res = await api.delete(`/categories/repair/${cat.id}`);
      if (res.success) {
        toast(`Repair category "${cat.name}" deleted successfully.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:repair-categories-updated'));
        }
        await fetchCategories();
      }
    } catch (err) {
      toast(err.message || 'Failed to delete repair category', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
    toast(`Category "${cat.name}" selected!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Repair Categories"
      subtitle="Create and manage device repair categories stored in PostgreSQL"
      wide={true}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Add Category Section */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
            <Plus size={16} color="var(--primary)" /> Add New Repair Category
          </h4>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Category Name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory(e);
                    }
                  }}
                  placeholder="e.g. Laptop, Mobile, Desktop, Printer, Drone"
                  required
                  autoFocus
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Description (Optional)</label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory(e);
                    }
                  }}
                  placeholder="e.g. Laptops, Ultrabooks, MacBooks"
                />
              </div>

              <button
                type="button"
                className="btn primary"
                onClick={handleAddCategory}
                disabled={submitting || !name.trim()}
                style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Save Category
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Categories List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="var(--primary)" /> PostgreSQL Repair Categories ({categories.length})
            </h4>
            <button
              type="button"
              className="btn small soft"
              onClick={fetchCategories}
              disabled={loading}
              title="Refresh repair categories"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>

          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            maxHeight: 320,
            overflowY: 'auto'
          }}>
            <table className="table" style={{ margin: 0, width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg, #fff)', zIndex: 1, borderBottom: '2px solid var(--border)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 14px' }}>Category Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 120 }}>Repair Jobs</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 100 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && categories.length === 0 ? (
                  <TableRowSkeleton cols={5} rows={4} />
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No repair categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => {
                    const isCurrent = (selectedCategoryId && Number(selectedCategoryId) === Number(c.id)) ||
                                      (selectedCategoryName && selectedCategoryName.toLowerCase() === c.name.toLowerCase());
                    const repairCount = parseInt(c.repairCount || 0, 10);
                    const canDelete = repairCount === 0;

                    return (
                      <tr
                        key={c.id}
                        style={{
                          background: isCurrent ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.08)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag size={14} color="var(--primary)" />
                            <span>{c.name}</span>
                            {isCurrent && (
                              <span style={{
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'var(--primary)',
                                color: '#fff',
                                fontWeight: 700
                              }}>
                                Selected
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12 }}>
                          {c.description || '—'}
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: repairCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg)',
                            color: repairCount > 0 ? '#059669' : 'var(--muted)',
                            fontWeight: 600
                          }}>
                            {repairCount} {repairCount === 1 ? 'job' : 'jobs'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: c.isActive !== false ? '#dcfce7' : '#f3f4f6',
                            color: c.isActive !== false ? '#15803d' : '#6b7280',
                            fontWeight: 700
                          }}>
                            {c.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              className="btn small soft"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleSelect(c)}
                              title={`Select ${c.name}`}
                            >
                              <Check size={12} /> Select
                            </button>

                            {canDelete ? (
                              <button
                                type="button"
                                className="btn small danger"
                                style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => handleDeleteCategory(c)}
                                disabled={deletingId === c.id}
                                title="Delete unused repair category"
                              >
                                {deletingId === c.id ? (
                                  <RefreshCw size={12} className="spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn small"
                                style={{ padding: '3px 8px', fontSize: 11, opacity: 0.4, cursor: 'not-allowed' }}
                                disabled
                                title={`Assigned to ${repairCount} repair job(s)`}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p style={{ margin: '8px 0 0 0', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} /> Repair categories with active or historical repair jobs cannot be deleted to preserve audit trails.
          </p>
        </div>
      </div>
    </Modal>
  );
}
