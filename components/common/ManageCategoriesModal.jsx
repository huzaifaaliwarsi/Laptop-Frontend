'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Check, AlertCircle, RefreshCw, Layers, Sliders, X, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { TableRowSkeleton } from './Skeleton';
import { useToast } from './Toast';
import api from '../../services/api';



export default function ManageCategoriesModal({
  isOpen,
  onClose,
  selectedCategory = '',
  onSelectCategory,
  onCategoriesUpdated,
  type = 'product'
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Editing existing category fields state
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingFields, setEditingFields] = useState([]);
  const [editingNewField, setEditingNewField] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isSpareParts = type === 'spare-parts';
  const apiEndpoint = isSpareParts ? '/categories/spare-parts' : '/categories/product';

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get(apiEndpoint);
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
      setCustomFields([]);
      setNewFieldName('');
      setEditingCategory(null);
    }
  }, [isOpen, type]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!codePrefix || codePrefix.length <= 3) {
      const autoPrefix = val.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
      setCodePrefix(autoPrefix);
    }
  };


  const addCustomField = () => {
    const clean = newFieldName.trim();
    if (!clean) return;
    if (customFields.some(f => f.toLowerCase() === clean.toLowerCase())) {
      toast(`Field "${clean}" already added`, 'warning');
      return;
    }
    setCustomFields([...customFields, clean]);
    setNewFieldName('');
  };

  const removeCustomField = (fieldToRemove) => {
    setCustomFields(customFields.filter(f => f !== fieldToRemove));
  };

  const handleAddCategory = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast('Please enter a category name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: cleanName,
        codePrefix: codePrefix.trim().toUpperCase() || cleanName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || (isSpareParts ? 'PRT' : 'CAT'),
        customFields: !isSpareParts ? customFields : []
      };

      const res = await api.post(apiEndpoint, payload);
      if (res.success && res.data) {
        toast(`Category "${res.data.name}" added successfully!`);
        setName('');
        setCodePrefix('');
        setCustomFields([]);
        setNewFieldName('');

        if (onSelectCategory) {
          onSelectCategory(res.data.name);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(isSpareParts ? 'app:spare-categories-updated' : 'app:categories-updated', { detail: res.data }));
          window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
        }

        await fetchCategories();
      }
    } catch (err) {
      toast(err.message || 'Failed to add category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit existing category fields handlers
  const startEditCategory = (cat) => {
    setEditingCategory(cat);
    const existing = Array.isArray(cat.custom_fields) ? [...cat.custom_fields] : [];
    setEditingFields(existing);
    setEditingNewField('');
  };


  const addEditingCustomField = () => {
    const clean = editingNewField.trim();
    if (!clean) return;
    if (editingFields.some(f => f.toLowerCase() === clean.toLowerCase())) {
      toast(`Field "${clean}" already added`, 'warning');
      return;
    }
    setEditingFields([...editingFields, clean]);
    setEditingNewField('');
  };

  const removeEditingCustomField = (fieldToRemove) => {
    setEditingFields(editingFields.filter(f => f !== fieldToRemove));
  };

  const saveEditedCategoryFields = async () => {
    if (!editingCategory) return;
    setSavingEdit(true);
    try {
      const res = await api.put(`${apiEndpoint}/${editingCategory.id}`, {
        name: editingCategory.name,
        codePrefix: editingCategory.code_prefix,
        customFields: editingFields
      });
      if (res.success) {
        toast(`Fields for "${editingCategory.name}" updated successfully!`);
        setEditingCategory(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:categories-updated', { detail: res.data }));
        }
        await fetchCategories();
      }
    } catch (err) {
      toast(err.message || 'Failed to update category fields', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const count = parseInt(isSpareParts ? (cat.part_count || 0) : (cat.product_count || 0), 10);
    if (count > 0) {
      toast(`Cannot delete "${cat.name}" because it is linked to ${count} ${isSpareParts ? 'spare part(s)' : 'product(s)'}`, 'error');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete category "${cat.name}" from database?`)) {
      return;
    }

    setDeletingId(cat.id);
    try {
      const res = await api.delete(`${apiEndpoint}/${cat.id}`);
      if (res.success) {
        toast(`Category "${cat.name}" deleted successfully.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(isSpareParts ? 'app:spare-categories-updated' : 'app:categories-updated'));
          window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
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
      title={isSpareParts ? "Manage Workshop Spare Part Categories" : "Manage Product Categories"}
      subtitle={isSpareParts ? "Create or delete workshop spare part categories stored in database" : "Configure categories and customize the exact specification fields that appear in Add Product"}
      wide={true}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Edit Category Fields Inline Modal / Section */}
        {editingCategory && !isSpareParts && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)',
            border: '2px solid var(--primary)',
            borderRadius: 10,
            padding: 18,
            boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="var(--primary)" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  Configure Custom Fields for &ldquo;{editingCategory.name}&rdquo;
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="btn small soft"
                style={{ padding: '2px 8px' }}
              >
                <X size={14} /> Cancel
              </button>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--muted)' }}>
              Add the exact specification field names you want for <strong>{editingCategory.name}</strong>. Only these fields will appear when adding or editing products in this category.
            </p>

            {/* Add Custom Named Field */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, maxWidth: 450 }}>
              <input
                className="input"
                style={{ height: 34, fontSize: 13 }}
                value={editingNewField}
                onChange={(e) => setEditingNewField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEditingCustomField();
                  }
                }}
                placeholder="Type custom field name (e.g. Battery Health, Color)"
              />
              <button
                type="button"
                onClick={addEditingCustomField}
                className="btn soft"
                style={{ height: 34, padding: '0 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                <Plus size={14} /> Add Field
              </button>
            </div>

            {/* Current Active Fields */}
            <div style={{
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 10,
              marginBottom: 14
            }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Active Fields ({editingFields.length}):
              </label>
              {editingFields.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  No fields defined. Only standard Brand and Model will be shown.
                </span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {editingFields.map(f => (
                    <span
                      key={f}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: 'var(--primary)',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1px solid rgba(59, 130, 246, 0.25)'
                      }}
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => removeEditingCustomField(f)}
                        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--danger, #ef4444)' }}
                        title={`Remove ${f}`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn soft"
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={saveEditedCategoryFields}
                disabled={savingEdit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {savingEdit ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={16} />}
                Save Fields for {editingCategory.name}
              </button>
            </div>
          </div>
        )}

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

            {/* Custom specification fields section for new category */}
            {!isSpareParts && (
              <div style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 6,
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={14} color="var(--primary)" />
                    Specification Fields for this Category (Optional):
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {customFields.length} field(s) selected
                  </span>
                </div>


                {/* Custom Name Input */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    style={{ height: 32, fontSize: 12, maxWidth: 300 }}
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomField();
                      }
                    }}
                    placeholder="+ Add custom field name (e.g. Battery, Color)..."
                  />
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="btn soft small"
                    style={{ height: 32, fontSize: 11, fontWeight: 600 }}
                  >
                    Add Field
                  </button>
                </div>

                {/* Selected Fields Preview */}
                {customFields.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                    {customFields.map(f => (
                      <span
                        key={f}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--primary)',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}
                      >
                        {f}
                        <button
                          type="button"
                          onClick={() => removeCustomField(f)}
                          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--danger, #ef4444)', display: 'flex' }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            maxHeight: 340,
            overflowY: 'auto'
          }}>
            <table className="table" style={{ margin: 0, width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg, #fff)', zIndex: 1, borderBottom: '2px solid var(--border)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 14px' }}>Category Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', width: 90 }}>Prefix</th>
                  {!isSpareParts && (
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Specification Fields</th>
                  )}
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 100 }}>Stock Items</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', width: 80 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', width: 200 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && categories.length === 0 ? (
                  <TableRowSkeleton cols={isSpareParts ? 5 : 6} rows={4} />
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={isSpareParts ? 5 : 6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => {
                    const isCurrent = selectedCategory && selectedCategory.toLowerCase() === c.name.toLowerCase();
                    const count = parseInt(isSpareParts ? (c.part_count || 0) : (c.product_count || 0), 10);
                    const canDelete = count === 0;
                    const catFields = Array.isArray(c.custom_fields) ? c.custom_fields : [];

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
                            {c.code_prefix || (isSpareParts ? 'PRT' : 'PRD')}
                          </code>
                        </td>

                        {!isSpareParts && (
                          <td style={{ padding: '10px 14px' }}>
                            {catFields.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 280 }}>
                                {catFields.slice(0, 3).map(f => (
                                  <span key={f} style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)'
                                  }}>
                                    {f}
                                  </span>
                                ))}
                                {catFields.length > 3 && (
                                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
                                    +{catFields.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                                Standard / None
                              </span>
                            )}
                          </td>
                        )}

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: count > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg)',
                            color: count > 0 ? '#059669' : 'var(--muted)',
                            fontWeight: 600
                          }}>
                            {count} {count === 1 ? (isSpareParts ? 'part' : 'item') : (isSpareParts ? 'parts' : 'items')}
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
                            {!isSpareParts && (
                              <button
                                type="button"
                                className="btn small soft"
                                style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => startEditCategory(c)}
                                title="Edit specification fields for this category"
                              >
                                <Sliders size={11} color="var(--primary)" /> Fields
                              </button>
                            )}

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
                                title={`Cannot delete: Assigned to ${count} active ${isSpareParts ? 'spare part(s)' : 'product(s)'}`}
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
            <AlertCircle size={12} /> Click &ldquo;Fields&rdquo; to customize what specification inputs show up when adding products in that category.
          </p>
        </div>
      </div>
    </Modal>
  );
};

