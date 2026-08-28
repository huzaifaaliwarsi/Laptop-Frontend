'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import ManageCategoriesModal from './ManageCategoriesModal';
import api from '../../services/api';

export default function CommonProductFields({
  values = {},
  onChange,
  categories = [],
  onAddNewCategory,
  prefix = ''
}) {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState([]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories/product');
      if (res.success && Array.isArray(res.data)) {
        setLocalCategories(res.data);
      }
    } catch (err) {
      console.error('Error fetching categories in CommonProductFields:', err);
    }
  }, []);

  // Fetch live categories on mount
  useEffect(() => {
    loadCategories();

    const handleCategoryUpdate = () => {
      loadCategories();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('app:categories-updated', handleCategoryUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:categories-updated', handleCategoryUpdate);
      }
    };
  }, [loadCategories]);

  // Also sync if parent passes categories prop
  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(prev => {
        const combined = [...prev];
        categories.forEach(c => {
          const name = typeof c === 'string' ? c : c.name;
          if (name && !combined.some(item => (typeof item === 'string' ? item : item.name) === name)) {
            combined.push(c);
          }
        });
        return combined;
      });
    }
  }, [categories]);

  const cat = values.category || values.categoryName || '';
  const showComputer = ['Laptop', 'PC', 'All-in-One'].includes(cat);
  const showScreen = cat === 'LCD / Screen';
  const showAccessory = cat === 'Accessories';

  // Merge default categories with backend categories
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  const handleInlineAdd = async () => {
    const clean = inlineCatName.trim();
    if (!clean) return;
    setInlineSubmitting(true);
    try {
      const res = await api.post('/categories/product', {
        name: clean,
        codePrefix: clean.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CAT'
      });
      if (res.success && res.data) {
        handleCategoryFromModal(res.data.name);
        setIsInlineAdding(false);
        setInlineCatName('');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:categories-updated', { detail: res.data }));
        }
      }
    } catch (err) {
      console.error(err);
      // Even if API returns duplicate or error, select the typed name
      handleCategoryFromModal(clean);
      setIsInlineAdding(false);
      setInlineCatName('');
    } finally {
      setInlineSubmitting(false);
    }
  };

  const defaultCats = ['Laptop', 'LCD / Screen', 'Accessories', 'PC', 'All-in-One'];
  const allCatNames = Array.from(new Set([
    ...defaultCats,
    ...localCategories.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean),
    ...categories.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean),
    cat
  ].filter(Boolean)));

  const handleCategorySelect = (e) => {
    const val = e.target.value;
    if (val === '__add_category__' || val === '__manage__') {
      setIsManageModalOpen(true);
      return;
    }
    onChange(prefix ? `${prefix}category` : 'category', val);
    onChange(prefix ? `${prefix}categoryName` : 'categoryName', val);
  };

  const handleCategoryFromModal = async (newCategoryName) => {
    if (!newCategoryName) return;
    
    // 1. Immediately set the dropdown value (optimistic)
    onChange(prefix ? `${prefix}category` : 'category', newCategoryName);
    onChange(prefix ? `${prefix}categoryName` : 'categoryName', newCategoryName);
    
    // 2. Optimistically add to local list so dropdown has the option
    setLocalCategories(prev => {
      const exists = prev.some(c => (typeof c === 'string' ? c : c.name) === newCategoryName);
      if (!exists) {
        return [...prev, { id: Date.now(), name: newCategoryName, code_prefix: 'CAT', is_system: false }];
      }
      return prev;
    });

    // 3. Fetch fresh list from DB to replace optimistic with real data
    try {
      const res = await api.get('/categories/product');
      if (res.success && Array.isArray(res.data)) {
        setLocalCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh categories after selection:', err);
    }
  };

  const handleCategoriesUpdated = (updatedCats) => {
    if (Array.isArray(updatedCats)) {
      setLocalCategories(updatedCats);
    }
  };

  const handleChange = (field, val) => {
    onChange(prefix ? `${prefix}${field}` : field, val);
  };

  return (
    <>
      <div className="field span-4">
        <label style={{ fontWeight: 600 }}>Category *</label>

        <select
          className="select"
          value={cat}
          onChange={handleCategorySelect}
          required
        >
          <option value="">-- Select Category --</option>
          {allCatNames.map((cName) => (
            <option key={cName} value={cName}>
              {cName}
            </option>
          ))}
          <option value="__add_category__" style={{ fontWeight: 700, color: 'var(--primary)' }}>
            + Add New Category...
          </option>
        </select>
      </div>

      {/* Category Manager Modal */}
      <ManageCategoriesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        selectedCategory={cat}
        onSelectCategory={handleCategoryFromModal}
        onCategoriesUpdated={handleCategoriesUpdated}
      />

      <div className="field span-4">
        <label>Brand *</label>
        <input
          className="input"
          value={values.brand || ''}
          onChange={(e) => handleChange('brand', e.target.value)}
          placeholder="Brand"
          required
        />
      </div>

      <div className="field span-4">
        <label>Model / Product Name *</label>
        <input
          className="input"
          value={values.model || values.productName || ''}
          onChange={(e) => handleChange('model', e.target.value)}
          placeholder="Model or product name"
          required
        />
      </div>

      {(showComputer || showScreen) && (
        <div className="field span-4">
          <label>Screen Size / Size in Inches</label>
          <input
            className="input"
            value={values.screenSize || ''}
            onChange={(e) => handleChange('screenSize', e.target.value)}
            placeholder="e.g. 14 inch"
          />
        </div>
      )}

      {showComputer && (
        <>
          <div className="field span-4">
            <label>Processor</label>
            <input
              className="input"
              value={values.processor || ''}
              onChange={(e) => handleChange('processor', e.target.value)}
              placeholder="Processor"
            />
          </div>
          <div className="field span-4">
            <label>RAM</label>
            <input
              className="input"
              value={values.ram || ''}
              onChange={(e) => handleChange('ram', e.target.value)}
              placeholder="RAM"
            />
          </div>
          <div className="field span-4">
            <label>ROM / SSD</label>
            <input
              className="input"
              value={values.romSsd || ''}
              onChange={(e) => handleChange('romSsd', e.target.value)}
              placeholder="ROM / SSD"
            />
          </div>
          <div className="field span-4">
            <label>Hard Drive</label>
            <input
              className="input"
              value={values.hardDrive || ''}
              onChange={(e) => handleChange('hardDrive', e.target.value)}
              placeholder="Hard drive"
            />
          </div>
          <div className="field span-4">
            <label>Graphics Card</label>
            <input
              className="input"
              value={values.graphicsCard || ''}
              onChange={(e) => handleChange('graphicsCard', e.target.value)}
              placeholder="Graphics card"
            />
          </div>
        </>
      )}

      {showAccessory && (
        <>
          <div className="field span-4">
            <label>Accessory Category</label>
            <input
              className="input"
              value={values.accessoryCategory || ''}
              onChange={(e) => handleChange('accessoryCategory', e.target.value)}
              placeholder="Mouse, Keyboard, Charger, etc."
            />
          </div>
          <div className="field span-8">
            <label>Accessory Description</label>
            <input
              className="input"
              value={values.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Product description"
            />
          </div>
        </>
      )}

      <div className="field span-12">
        <label>Others / Additional Specifications</label>
        <input
          className="input"
          value={values.others || values.specifications || ''}
          onChange={(e) => handleChange('others', e.target.value)}
          placeholder="Any additional specifications"
        />
      </div>

      <div className="field span-3">
        <label>Condition</label>
        <select
          className="select"
          value={values.condition || 'Used'}
          onChange={(e) => handleChange('condition', e.target.value)}
        >
          <option value="New">New</option>
          <option value="Used">Used</option>
          <option value="Refurbished">Refurbished</option>
        </select>
      </div>

      <div className="field span-3">
        <label>Quantity *</label>
        <input
          className="input"
          type="number"
          min="1"
          step="1"
          value={values.quantity !== undefined ? values.quantity : 1}
          onChange={(e) => handleChange('quantity', e.target.value)}
          required
        />
      </div>

      <div className="field span-3">
        <label>Low Stock Alert</label>
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={values.lowStockAlert !== undefined ? values.lowStockAlert : 1}
          onChange={(e) => handleChange('lowStockAlert', e.target.value)}
        />
      </div>

      <div className="field span-3">
        <label>Cost Price *</label>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={values.costPrice !== undefined ? values.costPrice : ''}
          onChange={(e) => handleChange('costPrice', e.target.value)}
          placeholder="0"
          required
        />
      </div>

      <div className="field span-4">
        <label>Expected Sale Price</label>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={values.expectedSalePrice !== undefined ? values.expectedSalePrice : ''}
          onChange={(e) => handleChange('expectedSalePrice', e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="field span-8">
        <label>Remarks</label>
        <input
          className="input"
          value={values.remarks || ''}
          onChange={(e) => handleChange('remarks', e.target.value)}
          placeholder="Optional remarks"
        />
      </div>
    </>
  );
}
