'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import Modal from './Modal';
import { TableRowSkeleton } from './Skeleton';
import { useToast } from './Toast';
import api from '../../services/api';

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  selectedCategory = '',
  onSelectCategory,
  onCategoriesUpdated
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories/product');
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
        if (onCategoriesUpdated) {
          onCategoriesUpdated(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setName('');
      setCodePrefix('');
    }
  }, [isOpen]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!codePrefix || codePrefix.length <= 3) {
      const autoPrefix = val.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
      setCodePrefix(autoPrefix);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast('Please enter a category name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: cleanName,
        codePrefix: codePrefix.trim().toUpperCase() || cleanName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CAT'
      };

      const res = await api.post('/categories/product', payload);
      if (res.success && res.data) {
        toast(`Category "${res.data.name}" added and selected!`);
        setName('');
        setCodePrefix('');
        
        // 1. Select the new category immediately in the product form
        if (onSelectCategory) {
          onSelectCategory(res.data.name);
        }

        // 2. Broadcast event to entire app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:categories-updated', { detail: res.data }));
        }

        // 3. Auto-close modal immediately so user sees it selected in Image 2
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Failed to add category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const productCount = parseInt(cat.product_count || 0, 10);
    if (productCount > 0) {
      toast(`Cannot delete "${cat.name}" because it is linked to ${productCount} product(s)`, 'error');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete category "${cat.name}" from database?`)) {
      return;
    }

    setDeletingId(cat.id);
    try {
      const res = await api.delete(`/categories/product/${cat.id}`);
      if (res.success) {
        toast(`Category "${cat.name}" deleted successfully.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:categories-updated'));
        }
        await fetchCategories();
      }
    } catch (err) {
      toast(err.message || 'Failed to delete category', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (catName) => {
    if (onSelectCategory) {
      onSelectCategory(catName);
    }
    toast(`Category "${catName}" selected!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Product Categories"
      subtitle="Create new categories or delete unused categories stored in PostgreSQL database"
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
            <Plus size={16} color="var(--primary)" /> Add New Category to Database
          </h4>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Category Name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={handleNameChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory(e);
                    }
                  }}
                  placeholder="e.g. Graphic Cards, Printers, Smart Watch"
                  required
                  autoFocus
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Code Prefix (3-4 Chars)</label>
                <input
                  className="input"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory(e);
                    }
                  }}
                  placeholder="e.g. GPU, PRN"
                  maxLength={6}
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
              <Layers size={16} color="var(--primary)" /> Database Categories ({categories.length})
            </h4>
            <button
              type="button"
              className="btn small soft"
              onClick={fetchCategories}
              disabled={loading}
              title="Refresh categories"
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
                  <th style={{ textAlign: 'left', padding: '10px 14px', width: 110 }}>Prefix</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 120 }}>Stock Items</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 100 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && categories.length === 0 ? (
                  <TableRowSkeleton cols={5} rows={4} />
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => {
                    const isCurrent = selectedCategory && selectedCategory.toLowerCase() === c.name.toLowerCase();
                    const productCount = parseInt(c.product_count || 0, 10);
                    const canDelete = productCount === 0;

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

                        <td style={{ padding: '10px 14px' }}>
                          <code style={{
                            fontSize: 12,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            fontWeight: 700
                          }}>
                            {c.code_prefix || 'PRD'}
                          </code>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: productCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg)',
                            color: productCount > 0 ? '#059669' : 'var(--muted)',
                            fontWeight: 600
                          }}>
                            {productCount} {productCount === 1 ? 'item' : 'items'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {c.is_system ? (
                            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                              Default
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
                              Custom
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              className="btn small soft"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleSelect(c.name)}
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
                                title="Delete empty category from database"
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
                                title={`Cannot delete: Assigned to ${productCount} active product(s)`}
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
            <AlertCircle size={12} /> Any category with 0 stock items can be deleted anytime. Categories assigned to active stock products cannot be deleted.
          </p>
        </div>
      </div>
    </Modal>
  );
}
