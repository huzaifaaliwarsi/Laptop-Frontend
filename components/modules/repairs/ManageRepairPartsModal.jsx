'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import RepairPartModal from './RepairPartModal';

const CATEGORIES = [
  'All',
  'Screen / Display',
  'Battery',
  'Keyboard',
  'Motherboard IC',
  'Cooling / Fan',
  'Power Port / Jack',
  'Thermal Paste',
  'RAM / Memory',
  'Storage / SSD',
  'Hinges & Casing',
  'Flex Cable & Connector',
  'Other Spare Part'
];

export default function ManageRepairPartsModal({
  isOpen,
  onClose,
  onSelectPart = null
}) {
  const { toast } = useToast();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPartForEdit, setSelectedPartForEdit] = useState(null);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      let query = '/repair-parts?';
      if (selectedCategory !== 'All') query += `category=${encodeURIComponent(selectedCategory)}&`;
      if (search.trim()) query += `search=${encodeURIComponent(search.trim())}&`;
      const res = await api.get(query);
      if (res.success) {
        setParts(res.data || []);
      }
    } catch (err) {
      toast(err.message || 'Error fetching spare parts', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchParts();
    }
  }, [isOpen, fetchParts]);

  useEffect(() => {
    const handleUpdated = () => {
      if (isOpen) fetchParts();
    };
    window.addEventListener('app:repair-parts-updated', handleUpdated);
    return () => window.removeEventListener('app:repair-parts-updated', handleUpdated);
  }, [isOpen, fetchParts]);

  const handleToggleStatus = async (part) => {
    try {
      const res = await api.patch(`/repair-parts/${part.id}/toggle`);
      if (res.success) {
        toast(`Spare part marked as ${res.data.status}`);
        fetchParts();
        window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
      }
    } catch (err) {
      toast(err.message || 'Error updating status', 'error');
    }
  };

  const handleDelete = async (part) => {
    if (!confirm(`Are you sure you want to delete spare part "${part.name}"?`)) return;
    try {
      const res = await api.delete(`/repair-parts/${part.id}`);
      if (res.success) {
        toast('Spare part deleted successfully');
        fetchParts();
        window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
      }
    } catch (err) {
      toast(err.message || 'Error deleting spare part', 'error');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Repair Spare Parts Inventory Catalog"
        subtitle="Manage workshop replacement parts, compatibility, costs & inventory"
        size="large"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Top Bar: Search, Category Filter, and Add Button */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280 }}>
              <input
                type="text"
                className="input"
                placeholder="Search by part name, SKU code, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ width: 170 }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn primary"
              style={{ fontWeight: 700 }}
              onClick={() => {
                setSelectedPartForEdit(null);
                setIsPartModalOpen(true);
              }}
            >
              + Add New Spare Part
            </button>
          </div>

          {/* Parts Table */}
          <div className="table-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>SKU Code</th>
                  <th>Part Specification & Compatible Models</th>
                  <th style={{ width: 130 }}>Category</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Cost Price</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Customer Price</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Stock</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Status</th>
                  <th style={{ width: 120, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
                      Loading spare parts catalog...
                    </td>
                  </tr>
                ) : parts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
                      No spare parts found. Click &quot;+ Add New Spare Part&quot; to add components to the catalog.
                    </td>
                  </tr>
                ) : (
                  parts.map(part => {
                    const isLowStock = part.currentStock <= part.minStockAlert;
                    return (
                      <tr key={part.id}>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: 11, color: 'var(--primary)', fontFamily: 'monospace' }}>
                            {part.code}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{part.name}</div>
                          {part.compatibleModels && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                              Compatibility: {part.compatibleModels}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {part.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>
                          {part.costPrice > 0 ? `PKR ${part.costPrice.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f766e' }}>
                          PKR {part.sellingPrice.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 800,
                              background: part.currentStock === 0 ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7',
                              color: part.currentStock === 0 ? '#b91c1c' : isLowStock ? '#b45309' : '#15803d'
                            }}
                          >
                            {part.currentStock} {part.currentStock === 0 ? 'Out' : isLowStock ? 'Low' : ''}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            onClick={() => handleToggleStatus(part)}
                            style={{
                              cursor: 'pointer',
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: part.status === 'Active' ? '#e0f2fe' : '#f1f5f9',
                              color: part.status === 'Active' ? '#0369a1' : '#64748b'
                            }}
                            title="Click to toggle status"
                          >
                            {part.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {onSelectPart && (
                              <button
                                type="button"
                                className="btn primary"
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                onClick={() => {
                                  onSelectPart(part);
                                  onClose();
                                }}
                              >
                                Select
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn soft"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={() => {
                                setSelectedPartForEdit(part);
                                setIsPartModalOpen(true);
                              }}
                              title="Edit Part"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn danger"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={() => handleDelete(part)}
                              title="Delete Part"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Single Part Modal */}
      <RepairPartModal
        isOpen={isPartModalOpen}
        onClose={() => {
          setIsPartModalOpen(false);
          setSelectedPartForEdit(null);
        }}
        part={selectedPartForEdit}
        onSuccess={(saved) => {
          fetchParts();
          if (onSelectPart && !selectedPartForEdit) {
            onSelectPart(saved);
          }
        }}
      />
    </>
  );
}
