'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Settings2, Sliders } from 'lucide-react';
import ManageCategoriesModal from './ManageCategoriesModal';
import api from '../../services/api';

// Map known standard field names to their specific form property & placeholder
const KNOWN_FIELD_MAPPINGS = {
  'brand': { key: 'brand', label: 'Brand', placeholder: 'Brand (e.g. Dell, HP, Apple)', span: 'span-4' },
  'model': { key: 'model', label: 'Model', placeholder: 'Model or product name', span: 'span-4' },
  'model / product name': { key: 'model', label: 'Model / Product Name', placeholder: 'Model or product name', span: 'span-4' },
  'product name': { key: 'model', label: 'Product Name', placeholder: 'Product name', span: 'span-4' },
  'name': { key: 'model', label: 'Product / Item Name', placeholder: 'e.g. Item Name', span: 'span-4' },
  'screen size': { key: 'screenSize', label: 'Screen Size / Size in Inches', placeholder: 'e.g. 14 inch', span: 'span-4' },
  'screen size / size in inches': { key: 'screenSize', label: 'Screen Size / Size in Inches', placeholder: 'e.g. 14 inch', span: 'span-4' },
  'processor': { key: 'processor', label: 'Processor', placeholder: 'e.g. Core i7 12th Gen', span: 'span-4' },
  'cpu': { key: 'processor', label: 'Processor', placeholder: 'e.g. Core i7 12th Gen', span: 'span-4' },
  'ram': { key: 'ram', label: 'RAM', placeholder: 'e.g. 16GB DDR4', span: 'span-4' },
  'rom / ssd': { key: 'romSsd', label: 'ROM / SSD', placeholder: 'e.g. 512GB NVMe', span: 'span-4' },
  'storage / rom': { key: 'romSsd', label: 'Storage / ROM', placeholder: 'e.g. 128GB / 256GB', span: 'span-4' },
  'ssd': { key: 'romSsd', label: 'SSD', placeholder: 'e.g. 512GB SSD', span: 'span-4' },
  'hard drive': { key: 'hardDrive', label: 'Hard Drive', placeholder: 'e.g. 1TB HDD', span: 'span-4' },
  'hdd': { key: 'hardDrive', label: 'Hard Drive', placeholder: 'e.g. 1TB HDD', span: 'span-4' },
  'graphics card': { key: 'graphicsCard', label: 'Graphics Card', placeholder: 'e.g. NVIDIA RTX 3060 6GB', span: 'span-4' },
  'graphics': { key: 'graphicsCard', label: 'Graphics Card', placeholder: 'e.g. Intel Iris Xe / RTX', span: 'span-4' },
  'gpu': { key: 'graphicsCard', label: 'Graphics Card', placeholder: 'e.g. Dedicated GPU', span: 'span-4' },
  'accessory category': { key: 'accessoryCategory', label: 'Accessory Category', placeholder: 'Mouse, Keyboard, Charger, etc.', span: 'span-4' },
  'accessory type': { key: 'accessoryCategory', label: 'Accessory Type', placeholder: 'Mouse, Keyboard, Charger, etc.', span: 'span-4' },
  'accessory description': { key: 'description', label: 'Accessory Description', placeholder: 'Product description', span: 'span-8' },
  'description': { key: 'description', label: 'Description', placeholder: 'Product description', span: 'span-8' },
  'battery health': { key: 'batteryHealth', label: 'Battery Health', placeholder: 'e.g. 88% / Good', span: 'span-4' },
  'color': { key: 'color', label: 'Color', placeholder: 'e.g. Space Gray, Silver, Black', span: 'span-4' },
  'imei / serial': { key: 'imeiSerial', label: 'IMEI / Serial Number', placeholder: 'e.g. 358923...', span: 'span-4' },
  'resolution': { key: 'resolution', label: 'Resolution', placeholder: 'e.g. 1920x1080 / 4K', span: 'span-4' },
  'panel type': { key: 'panelType', label: 'Panel Type', placeholder: 'e.g. IPS, OLED, TN', span: 'span-4' },
  'wattage / power': { key: 'wattage', label: 'Wattage / Power', placeholder: 'e.g. 65W, 100W', span: 'span-4' }
};

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

  // Sync if parent passes categories prop
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

  // Determine active category object and its dynamic fields
  const currentCatObj = localCategories.find(c => {
    const cName = typeof c === 'string' ? c : c?.name;
    return cName && cName.toLowerCase() === String(cat).toLowerCase();
  });

  const definedCustomFields = currentCatObj && Array.isArray(currentCatObj.custom_fields) && currentCatObj.custom_fields.length > 0
    ? currentCatObj.custom_fields
    : null;

  // Fallback defaults if category does not have custom_fields in DB
  const showComputer = ['Laptop', 'PC', 'All-in-One'].includes(cat);
  const showScreen = cat === 'LCD / Screen';
  const showAccessory = ['Accessories', 'Accessory'].includes(cat);

  let activeFields = [];
  if (definedCustomFields) {
    activeFields = definedCustomFields;
  } else if (showComputer) {
    activeFields = ['Screen Size', 'Processor', 'RAM', 'ROM / SSD', 'Hard Drive', 'Graphics Card'];
  } else if (showScreen) {
    activeFields = ['Screen Size / Size in Inches'];
  } else if (showAccessory) {
    activeFields = ['Accessory Category', 'Accessory Description'];
  }

  const defaultCats = ['Laptop', 'LCD / Screen', 'Accessories', 'PC', 'All-in-One', 'Mobile'];
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
    
    onChange(prefix ? `${prefix}category` : 'category', newCategoryName);
    onChange(prefix ? `${prefix}categoryName` : 'categoryName', newCategoryName);
    
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

  const handleCustomFieldChange = (fieldName, val, standardKey) => {
    if (standardKey) {
      handleChange(standardKey, val);
    }
    // Also save into customFields dictionary
    const currentCustom = values.customFields || {};
    const updatedCustom = { ...currentCustom, [fieldName]: val };
    onChange(prefix ? `${prefix}customFields` : 'customFields', updatedCustom);
    // Also store directly by fieldName
    onChange(prefix ? `${prefix}${fieldName}` : fieldName, val);
  };

  const getCustomFieldValue = (fieldName, standardKey) => {
    if (standardKey && values[standardKey] !== undefined && values[standardKey] !== null) {
      return values[standardKey];
    }
    if (values.customFields && values.customFields[fieldName] !== undefined) {
      return values.customFields[fieldName];
    }
    if (values[fieldName] !== undefined && values[fieldName] !== null) {
      return values[fieldName];
    }
    return '';
  };

  return (
    <>
      <div className="field span-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label style={{ fontWeight: 600, margin: 0 }}>Category *</label>
          <button
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--primary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: 0
            }}
            title="Manage categories and customize specification fields"
          >
            <Sliders size={12} /> Configure Fields
          </button>
        </div>

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
            + Add / Manage Categories...
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

      {/* DYNAMIC CATEGORY SPECIFICATION FIELDS (Only fields configured for this category) */}
      {activeFields.map((fieldName) => {
        const lowerName = fieldName.toLowerCase().trim();
        const mapping = KNOWN_FIELD_MAPPINGS[lowerName];
        const standardKey = mapping?.key || null;
        const label = mapping?.label || fieldName;
        const placeholder = mapping?.placeholder || fieldName;
        const spanClass = mapping?.span || 'span-4';
        const val = getCustomFieldValue(fieldName, standardKey);

        return (
          <div key={fieldName} className={`field ${spanClass}`}>
            <label>{label}</label>
            <input
              className="input"
              value={val}
              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value, standardKey)}
              placeholder={placeholder}
            />
          </div>
        );
      })}

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
