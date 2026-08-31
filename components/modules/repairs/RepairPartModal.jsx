'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Tag } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

const DEFAULT_SPARE_CATEGORIES = [
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
  'Camera / Speaker / Wi-Fi',
  'Other Spare Part'
];

export default function RepairPartModal({
  isOpen,
  onClose,
  part = null,
  onSuccess
}) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Screen / Display');
  const [categoriesList, setCategoriesList] = useState(DEFAULT_SPARE_CATEGORIES);
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [compatibleModels, setCompatibleModels] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('1');
  const [minStockAlert, setMinStockAlert] = useState('2');
  const [status, setStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);

  const fetchSpareCategories = useCallback(async () => {
    try {
      const res = await api.get('/repair-parts/categories');
      if (res.success && Array.isArray(res.data)) {
        setCategoriesList(prev => {
          const merged = Array.from(new Set([...DEFAULT_SPARE_CATEGORIES, ...res.data, ...prev])).filter(Boolean);
          return merged;
        });
      }
    } catch (err) {
      console.error('Error fetching spare part categories:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSpareCategories();
      setIsAddingNewCat(false);
      setNewCatInput('');

      if (part) {
        setCode(part.code || '');
        setName(part.name || '');
        setCategory(part.category || 'Screen / Display');
        setCompatibleModels(part.compatibleModels || '');
        setCostPrice(part.costPrice !== undefined ? String(part.costPrice) : '');
        setSellingPrice(part.sellingPrice !== undefined ? String(part.sellingPrice) : '');
        setCurrentStock(part.currentStock !== undefined ? String(part.currentStock) : '0');
        setMinStockAlert(part.minStockAlert !== undefined ? String(part.minStockAlert) : '2');
        setStatus(part.status || 'Active');

        // Make sure part's current category is in the list
        if (part.category) {
          setCategoriesList(prev => {
            if (!prev.includes(part.category)) return [part.category, ...prev];
            return prev;
          });
        }
      } else {
        setCode('');
        setName('');
        setCategory('Screen / Display');
        setCompatibleModels('');
        setCostPrice('');
        setSellingPrice('');
        setCurrentStock('5');
        setMinStockAlert('2');
        setStatus('Active');
      }
    }
  }, [isOpen, part, fetchSpareCategories]);

  const handleCategorySelect = (e) => {
    const val = e.target.value;
    if (val === '__add_new_category__') {
      setIsAddingNewCat(true);
      setNewCatInput('');
    } else {
      setCategory(val);
    }
  };

  const handleSaveNewCategory = () => {
    const clean = newCatInput.trim();
    if (!clean) {
      toast('Please enter a valid category name', 'error');
      return;
    }
    setCategoriesList(prev => {
      if (!prev.includes(clean)) return [clean, ...prev];
      return prev;
    });
    setCategory(clean);
    setIsAddingNewCat(false);
    setNewCatInput('');
    toast(`Category "${clean}" added!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Spare part name is required', 'error');
      return;
    }

    if (!category.trim()) {
      toast('Please select or specify a category', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim() || undefined,
        name: name.trim(),
        category: category.trim(),
        compatibleModels: compatibleModels.trim() || undefined,
        costPrice: costPrice !== '' ? parseFloat(costPrice) : 0,
        sellingPrice: sellingPrice !== '' ? parseFloat(sellingPrice) : 0,
        currentStock: currentStock !== '' ? parseInt(currentStock, 10) : 0,
        minStockAlert: minStockAlert !== '' ? parseInt(minStockAlert, 10) : 2,
        status
      };

      let res;
      if (part && part.id) {
        res = await api.put(`/repair-parts/${part.id}`, payload);
      } else {
        res = await api.post('/repair-parts', payload);
      }

      if (res.success) {
        toast(`Repair spare part ${part ? 'updated' : 'created'} successfully!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
        }
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error saving repair spare part', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={part ? "Edit Repair Spare Part" : "Add Repair Spare Part"}
      subtitle="Manage workshop spare parts inventory for repairs"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="repairPartForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (part ? 'Update Part' : 'Save Spare Part')}
          </button>
        </>
      }
    >
      <form id="repairPartForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-8">
            <label>Part Name / Specification *</label>
            <input
              type="text"
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dell 15.6 FHD 30-Pin Screen, HP HT03XL Battery"
            />
          </div>

          <div className="field span-4">
            <label>Part Code / SKU (Optional)</label>
            <input
              type="text"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Auto (e.g. PRT-0014)"
            />
          </div>

          <div className="field span-6">
            <label>Part Category *</label>
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">-- Select Spare Category --</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="field span-6">
            <label>Compatible Brands / Models</label>
            <input
              type="text"
              className="input"
              value={compatibleModels}
              onChange={(e) => setCompatibleModels(e.target.value)}
              placeholder="e.g. Dell Inspiron 3511, HP 15-dw, Latitude 5400"
            />
          </div>

          <div className="field span-4">
            <label>Cost Price (PKR)</label>
            <input
              type="number"
              className="input"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="field span-4">
            <label>Default Customer Price (PKR)</label>
            <input
              type="number"
              className="input"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="field span-2">
            <label>Current Stock</label>
            <input
              type="number"
              className="input"
              min="0"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="field span-2">
            <label>Min Alert</label>
            <input
              type="number"
              className="input"
              min="0"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
              placeholder="2"
            />
          </div>

          <div className="field span-12">
            <label>Status</label>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active (Available for technicians)</option>
              <option value="Inactive">Inactive (Archived)</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
