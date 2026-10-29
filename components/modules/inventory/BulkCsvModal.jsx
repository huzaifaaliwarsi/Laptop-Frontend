'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Sparkles,
  Edit3,
  X,
  FileUp
} from 'lucide-react';

function triggerCsvDownload(csvString, filename) {
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Auto-detect delimiter: comma, tab, or semicolon
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas && semicolons > tabs) return ';';
  return ',';
}

// Split single line respecting quotes and dynamic delimiter
function splitLine(line, delimiter = ',') {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim());
  return res;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('\t')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function BulkCsvModal({
  isOpen,
  onClose,
  onSuccess,
  products = [],
  categories: propCategories = []
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showRawTextarea, setShowRawTextarea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState('');

  // 1. Fetch live categories from database
  useEffect(() => {
    if (!isOpen) return;
    if (Array.isArray(propCategories) && propCategories.length > 0) {
      setCategories(propCategories);
      if (!selectedCategoryId) setSelectedCategoryId(String(propCategories[0].id));
      return;
    }

    setLoadingCats(true);
    api.get('/categories/product')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCategories(res.data);
          if (res.data.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(String(res.data[0].id));
          }
        }
      })
      .catch((err) => console.error('Failed to load categories for bulk import:', err))
      .finally(() => setLoadingCats(false));
  }, [isOpen, propCategories]);

  // Selected Category Object
  const selectedCat = useMemo(() => {
    return categories.find(c => String(c.id) === String(selectedCategoryId)) || categories[0] || null;
  }, [categories, selectedCategoryId]);

  // Extract clean array of custom field names from category
  const dynamicFields = useMemo(() => {
    if (!selectedCat || !selectedCat.custom_fields) return [];
    const cf = selectedCat.custom_fields;
    if (Array.isArray(cf)) {
      return cf.map(f => typeof f === 'object' && f !== null ? (f.name || f.label || '') : String(f)).filter(Boolean);
    }
    if (typeof cf === 'object' && cf !== null) {
      return Object.keys(cf);
    }
    return [];
  }, [selectedCat]);

  // Build full, deduplicated category columns list
  const getCategoryColumns = (fields = []) => {
    const hasBrand = fields.some(f => ['brand', 'make'].includes(f.toLowerCase().trim()));
    const hasModel = fields.some(f => ['model', 'model name', 'product name', 'item name', 'name'].includes(f.toLowerCase().trim()));

    const specColumns = [];
    if (!hasBrand) specColumns.push('Brand');
    if (!hasModel) specColumns.push('Model');

    fields.forEach(f => {
      const clean = String(f).trim();
      if (!specColumns.some(existing => existing.toLowerCase() === clean.toLowerCase())) {
        specColumns.push(clean);
      }
    });

    return [
      ...specColumns,
      'Condition',
      'Quantity',
      'Cost Price',
      'Expected Sale Price',
      'Low Stock Alert'
    ];
  };

  // Additional spec fields for table header (excluding Brand/Model to avoid duplicate columns)
  const specOnlyFields = useMemo(() => {
    return dynamicFields.filter(f => !['brand', 'make', 'model', 'model name', 'product name', 'item name', 'name'].includes(f.toLowerCase().trim()));
  }, [dynamicFields]);

  // Generate Category Specific Template
  const generateCategoryTemplate = (cat, fields) => {
    if (!cat) return '';
    const headers = getCategoryColumns(fields);

    const sampleRow = headers.map(header => {
      const lower = header.toLowerCase().trim();
      if (lower === 'brand') return 'Samsung';
      if (lower === 'model' || lower.includes('model') || lower.includes('name')) return `${cat.name} Pro`;
      if (lower.includes('processor') || lower.includes('cpu')) return 'Core i5 10th Gen';
      if (lower.includes('ram') || lower.includes('memory')) return '16GB';
      if (lower.includes('rom') || lower.includes('ssd') || lower.includes('storage')) return '512GB SSD';
      if (lower.includes('graphic') || lower.includes('gpu')) return 'Intel Iris Xe';
      if (lower.includes('screen') || lower.includes('display') || lower.includes('size')) return '14 inch';
      if (lower.includes('battery')) return '88%';
      if (lower.includes('color')) return 'Black';
      if (lower.includes('imei') || lower.includes('serial')) return '3598710293847';
      if (lower.includes('resolution')) return '1920x1080 FHD';
      if (lower.includes('type') || lower.includes('category')) return 'Standard';
      if (lower === 'condition') return 'New';
      if (lower === 'quantity') return '10';
      if (lower === 'cost price') return '1500';
      if (lower === 'expected sale price') return '2500';
      if (lower === 'low stock alert') return '2';
      return `Sample ${header}`;
    });

    return [
      headers.map(escapeCsv).join(','),
      sampleRow.map(escapeCsv).join(',')
    ].join('\r\n');
  };

  // Download Category-Specific CSV Template
  const handleDownloadTemplate = () => {
    if (!selectedCat) {
      toast('Please select a category first', 'warning');
      return;
    }
    const csvContent = generateCategoryTemplate(selectedCat, dynamicFields);
    const cleanFilename = `${selectedCat.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Import_Template.csv`;
    triggerCsvDownload(csvContent, cleanFilename);
    toast(`Template for "${selectedCat.name}" downloaded! Fill in Excel and upload.`, 'success');
  };

  // Load Sample for Currently Selected Category into Textbox
  const handleLoadSampleForCategory = () => {
    if (!selectedCat) return;
    const sample = generateCategoryTemplate(selectedCat, dynamicFields);
    setCsvText(sample);
    setLoadedFileName(`Sample_${selectedCat.name}.csv`);
    setShowRawTextarea(true);
    toast(`Loaded sample data for "${selectedCat.name}".`);
  };

  // Live client-side parsing adapted to selected category (with multi-delimiter support)
  const parsedPreview = useMemo(() => {
    if (!csvText.trim()) return { count: 0, items: [], errors: 0 };
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { count: 0, items: [], errors: 0 };

    const delimiter = detectDelimiter(csvText);
    const rawHeaders = splitLine(lines[0], delimiter);
    const normalizedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const standardHeaderAliases = {
      brand: ['brand', 'make'],
      model: ['model', 'modelname', 'productname', 'name', 'itemname'],
      condition: ['condition', 'state'],
      quantity: ['quantity', 'qty', 'stock', 'initialstock', 'count'],
      costPrice: ['costprice', 'cost', 'purchaseprice', 'buyprice'],
      expectedSalePrice: ['expectedsaleprice', 'saleprice', 'price', 'sellprice', 'sellingprice'],
      lowStockAlert: ['lowstockalert', 'lowstock', 'alert', 'minstock']
    };

    const stdIndices = {};
    const usedIndices = new Set();

    for (const [key, aliases] of Object.entries(standardHeaderAliases)) {
      const idx = normalizedHeaders.findIndex(h => aliases.includes(h));
      if (idx !== -1) {
        stdIndices[key] = idx;
        usedIndices.add(idx);
      }
    }

    // Dynamic field headers matching (excluding already-matched standard columns)
    const dynamicFieldMap = [];
    rawHeaders.forEach((rawH, idx) => {
      if (!usedIndices.has(idx) && rawH.trim()) {
        dynamicFieldMap.push({ fieldName: rawH.trim(), idx });
      }
    });

    const items = [];
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const vals = splitLine(lines[i], delimiter);
      if (!vals.some(Boolean)) continue;

      const brand = (stdIndices.brand !== undefined ? vals[stdIndices.brand] : vals[0]) || '';
      const model = (stdIndices.model !== undefined ? vals[stdIndices.model] : vals[1]) || '';
      const condition = (stdIndices.condition !== undefined ? vals[stdIndices.condition] : '') || 'Used';
      const quantity = parseInt(stdIndices.quantity !== undefined ? vals[stdIndices.quantity] : '0', 10);
      const costPrice = parseFloat(stdIndices.costPrice !== undefined ? vals[stdIndices.costPrice] : '0');
      const expectedSalePrice = parseFloat(stdIndices.expectedSalePrice !== undefined ? vals[stdIndices.expectedSalePrice] : '0');
      const lowStockAlert = parseInt(stdIndices.lowStockAlert !== undefined ? vals[stdIndices.lowStockAlert] : '1', 10);

      // Extract custom fields values
      const customFields = {};
      if (brand) customFields['Brand'] = brand;
      if (model) customFields['Model'] = model;

      dynamicFieldMap.forEach(({ fieldName, idx }) => {
        const v = vals[idx];
        if (v !== undefined && String(v).trim()) {
          customFields[fieldName] = String(v).trim();
        }
      });

      const isValid = Boolean(brand && model && !isNaN(quantity) && quantity > 0);
      if (!isValid) errors++;

      const item = {
        category: selectedCat ? selectedCat.name : '',
        categoryId: selectedCat ? selectedCat.id : null,
        brand,
        model,
        condition,
        quantity: isNaN(quantity) ? 0 : quantity,
        costPrice: isNaN(costPrice) ? 0 : costPrice,
        expectedSalePrice: isNaN(expectedSalePrice) ? 0 : expectedSalePrice,
        lowStockAlert: isNaN(lowStockAlert) ? 1 : lowStockAlert,
        customFields,
        isValid
      };

      // Map dynamic fields to standard DB columns if matching
      Object.entries(customFields).forEach(([fName, val]) => {
        const norm = fName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (['screensize', 'sizeininches', 'size'].includes(norm)) item.screenSize = val;
        if (['processor', 'cpu'].includes(norm)) item.processor = val;
        if (['ram', 'memory'].includes(norm)) item.ram = val;
        if (['romssd', 'storage', 'rom', 'ssd', 'storagerom', 'romssd'].includes(norm)) item.romSsd = val;
        if (['harddrive', 'hdd'].includes(norm)) item.hardDrive = val;
        if (['graphicscard', 'graphics', 'gpu'].includes(norm)) item.graphicsCard = val;
        if (['accessorycategory', 'accessorytype'].includes(norm)) item.accessoryCategory = val;
        if (['description'].includes(norm)) item.description = val;
      });

      items.push(item);
    }

    const validItems = items.filter(it => it.isValid);
    return { count: validItems.length, items, validItems, errors };
  }, [csvText, selectedCat]);

  const handleProcessFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setCsvText(text);
      setLoadedFileName(file.name);
      toast(`File "${file.name}" loaded successfully!`, 'success');
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleImportSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedCat) {
      toast('Please select a category first', 'error');
      return;
    }

    if (parsedPreview.count === 0) {
      toast('No valid product rows detected. Please ensure Brand, Model, and Quantity are filled.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/products/bulk-csv', {
        categoryId: selectedCat.id,
        categoryName: selectedCat.name,
        products: parsedPreview.validItems
      });

      if (res.success) {
        toast(`Success! ${res.data?.imported || parsedPreview.count} product(s) added into "${selectedCat.name}"!`, 'success');
        setCsvText('');
        setLoadedFileName('');
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error processing CSV import', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCurrentInventory = async () => {
    setExporting(true);
    try {
      const res = await api.get('/products/export-csv');
      if (typeof res === 'string' && res.includes(',')) {
        triggerCsvDownload(res, `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`);
        toast('Inventory CSV downloaded successfully!', 'success');
        return;
      }

      const list = products.length > 0 ? products : [];
      if (list.length === 0) {
        toast('No products found to export.', 'error');
        return;
      }

      const headers = ['Product Code', 'Category', 'Brand', 'Model', 'Specifications', 'Condition', 'Current Stock', 'Cost Price', 'Expected Sale Price', 'Low Stock Alert'];
      const rows = [headers.map(escapeCsv).join(',')];
      for (const p of list) {
        rows.push([
          p.code || '',
          p.category || p.categoryName || '',
          p.brand || '',
          p.model || '',
          p.specifications || '',
          p.condition || 'Used',
          p.currentStock || 0,
          p.costPrice || 0,
          p.expectedSalePrice || 0,
          p.lowStockAlert || 1
        ].map(escapeCsv).join(','));
      }

      triggerCsvDownload(rows.join('\r\n'), `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast('Inventory CSV downloaded successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to export inventory CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const currentCategoryColumns = useMemo(() => {
    return getCategoryColumns(dynamicFields);
  }, [dynamicFields]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Inventory CSV Manager"
      subtitle="Category-specific CSV imports with dynamic fields & full inventory export"
      wide={true}
      footer={
        activeTab === 'import' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
            <div style={{ fontSize: 12.5, minWidth: 0, flex: 1 }}>
              {parsedPreview.count > 0 ? (
                <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} />
                  Ready to import: <strong>{parsedPreview.count} item(s)</strong> into &quot;{selectedCat?.name}&quot;
                </span>
              ) : csvText.trim() ? (
                <span style={{ color: '#e11d48', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={16} /> 0 valid items found. Please check required fields.
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>
                  Select category, download template, and upload filled CSV file.
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleImportSubmit}
                disabled={submitting || parsedPreview.count === 0}
                style={{
                  minWidth: 150,
                  justifyContent: 'center',
                  fontWeight: 700,
                  boxShadow: parsedPreview.count > 0 ? '0 4px 12px rgba(37,99,235,0.25)' : 'none'
                }}
              >
                {submitting ? 'Importing...' : `Import ${parsedPreview.count} Products`}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {/* Tab Switcher: Import vs Export */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 12,
        marginBottom: 16
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'import' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'import' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease'
          }}
        >
          <Upload size={15} />
          <span>Category-Wise Bulk Import</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'export' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'export' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease'
          }}
        >
          <Download size={15} />
          <span>Export Inventory & Templates</span>
        </button>
      </div>

      {/* ── TAB 1: IMPORT ── */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* STEP 1: CLEAN CATEGORY SELECTOR & TEMPLATE DOWNLOAD TOOLBAR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce6f2',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 2px 6px rgba(15, 43, 85, 0.03)'
          }}>
            {/* Top Toolbar: Label + Dropdown + Download Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap'
            }}>
              {/* Left Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f2b55' }}>
                    Select Target Category
                  </h4>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#667892' }}>
                    Columns match your category&apos;s custom specification fields
                  </p>
                </div>
              </div>

              {/* Right Controls: Select + Download Button in Perfect Alignment */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap'
              }}>
                <div style={{ position: 'relative' }}>
                  <select
                    className="select"
                    value={selectedCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setCsvText('');
                      setLoadedFileName('');
                    }}
                    style={{
                      height: 40,
                      minWidth: 220,
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '0 36px 0 12px',
                      borderRadius: 8,
                      border: '1.5px solid #2563eb',
                      background: '#ffffff',
                      color: '#0f2b55',
                      cursor: 'pointer'
                    }}
                    disabled={loadingCats}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code_prefix})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={!selectedCat}
                  style={{
                    height: 40,
                    padding: '0 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1.5px solid #bfdbfe',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2563eb';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  title="Download clean CSV template for this category"
                >
                  <Download size={15} />
                  <span>Download Template (.CSV)</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Active Columns Badges */}
            {selectedCat && (
              <div style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6
              }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginRight: 4 }}>
                  Columns for {selectedCat.name} ({currentCategoryColumns.length}):
                </span>
                {currentCategoryColumns.map((colName, i) => {
                  const isFinancial = ['Condition', 'Quantity', 'Cost Price', 'Expected Sale Price', 'Low Stock Alert'].includes(colName);
                  return (
                    <span
                      key={i}
                      style={{
                        background: isFinancial ? '#f8fafc' : '#dbeafe',
                        color: isFinancial ? '#475569' : '#1d4ed8',
                        border: isFinancial ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                        fontSize: 11,
                        padding: '3px 9px',
                        borderRadius: 6,
                        fontWeight: 600
                      }}
                    >
                      {colName}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: MODERN DRAG-AND-DROP UPLOAD ZONE */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dce6f2',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 2px 6px rgba(15, 43, 85, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#0ea5e9',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f2b55' }}>
                    Upload CSV File
                  </h4>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#667892' }}>
                    Drag &amp; drop your completed file or paste CSV text directly
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn small soft"
                  onClick={handleLoadSampleForCategory}
                  disabled={!selectedCat}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  <Sparkles size={13} style={{ marginRight: 4 }} />
                  Load Sample Data
                </button>

                <button
                  type="button"
                  className="btn small"
                  onClick={() => setShowRawTextarea(!showRawTextarea)}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  <Edit3 size={13} style={{ marginRight: 4 }} />
                  {showRawTextarea ? 'Hide Raw Text' : 'Paste CSV Text'}
                </button>
              </div>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="cleanCategoryCsvInput"
            />

            {/* Drag & Drop Visual Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                background: isDragging ? '#eff6ff' : loadedFileName ? '#f0fdf4' : '#f8fafc',
                borderRadius: 10,
                padding: '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: loadedFileName ? '#dcfce7' : '#e0e7ff',
                color: loadedFileName ? '#16a34a' : '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}>
                {loadedFileName ? <CheckCircle2 size={22} /> : <FileUp size={22} />}
              </div>

              {loadedFileName ? (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#16a34a' }}>
                    Loaded: {loadedFileName}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    Click or drop another file to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                    Drop your CSV file here, or <span style={{ color: '#2563eb', textDecoration: 'underline' }}>Browse</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    Supports UTF-8 CSV exported from Microsoft Excel, Numbers, or Google Sheets
                  </div>
                </div>
              )}
            </div>

            {/* Optional Raw Textarea (Toggled or after loading sample) */}
            {showRawTextarea && (
              <div style={{ marginTop: 12 }}>
                <textarea
                  className="textarea"
                  style={{
                    minHeight: 120,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    lineHeight: '1.5',
                    padding: 10,
                    borderRadius: 8,
                    borderColor: parsedPreview.count > 0 ? '#86efac' : '#cbd5e1',
                    width: '100%'
                  }}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    if (!e.target.value.trim()) setLoadedFileName('');
                  }}
                  placeholder={currentCategoryColumns.join(',')}
                />
              </div>
            )}
          </div>

          {/* STEP 3: LIVE PARSED VALIDATION PREVIEW TABLE */}
          {parsedPreview.items.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #dce6f2',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 2px 6px rgba(15, 43, 85, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f2b55' }}>
                    Validated Preview:
                  </span>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700
                  }}>
                    {parsedPreview.count} Valid Items
                  </span>
                  {parsedPreview.errors > 0 && (
                    <span style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700
                    }}>
                      {parsedPreview.errors} Incomplete Rows
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setCsvText(''); setLoadedFileName(''); }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <X size={13} /> Clear
                </button>
              </div>

              <div style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 10px', width: 40 }}>#</th>
                      <th style={{ padding: '8px 10px' }}>Category</th>
                      <th style={{ padding: '8px 10px' }}>Brand</th>
                      <th style={{ padding: '8px 10px' }}>Model</th>
                      {specOnlyFields.map((f, i) => (
                        <th key={i} style={{ padding: '8px 10px', color: '#1d4ed8' }}>{f}</th>
                      ))}
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cost (PKR)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sale (PKR)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.items.map((it, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderTop: '1px solid #f1f5f9',
                          background: it.isValid ? 'transparent' : '#fff1f2'
                        }}
                      >
                        <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#334155' }}>{it.category}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>
                          {it.brand || <span style={{ color: '#e11d48' }}>Missing</span>}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#334155' }}>
                          {it.model || <span style={{ color: '#e11d48' }}>Missing</span>}
                        </td>
                        {specOnlyFields.map((f, i) => (
                          <td key={i} style={{ padding: '7px 10px', color: '#475569' }}>
                            {it.customFields[f] || '-'}
                          </td>
                        ))}
                        <td style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'center', color: it.quantity > 0 ? '#2563eb' : '#e11d48' }}>
                          {it.quantity}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right' }}>{it.costPrice.toLocaleString()}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{it.expectedSalePrice.toLocaleString()}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          {it.isValid ? (
                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 11 }}>✓ Ready</span>
                          ) : (
                            <span style={{ color: '#e11d48', fontWeight: 700, fontSize: 11 }}>✕ Incomplete</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Guidance Box */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 11.5,
            color: '#64748b',
            lineHeight: 1.5
          }}>
            💡 <strong>Smart Auto-Merge:</strong> If an uploaded product matches an existing item in this branch (same Category, Brand, Model &amp; Specs), its stock count will be <strong>automatically updated</strong> without creating duplicate entries.
          </div>
        </div>
      )}

      {/* ── TAB 2: EXPORT ── */}
      {activeTab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: '8px 0' }}>
          {/* Card 1: Full Inventory Export */}
          <div style={{
            border: '1px solid #dce6f2',
            borderRadius: 12,
            padding: 20,
            background: '#ffffff',
            boxShadow: '0 2px 6px rgba(15, 43, 85, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 10,
                background: '#dbeafe',
                color: '#1d4ed8',
                marginBottom: 12
              }}>
                <FileSpreadsheet size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: '#0f2b55' }}>
                Export Full Inventory (.CSV)
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: '#667892', lineHeight: 1.5 }}>
                Download complete active stock including Product Codes, Specs, Current Stock, Cost, Sale Price, and Supplier.
              </p>
            </div>

            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 18, width: '100%', justifyContent: 'center', fontWeight: 700 }}
              onClick={handleDownloadCurrentInventory}
              disabled={exporting}
            >
              <Download size={15} style={{ marginRight: 6 }} />
              {exporting ? 'Generating CSV...' : 'Download Current Stock CSV'}
            </button>
          </div>

          {/* Card 2: Dynamic Category Template Download */}
          <div style={{
            border: '1px solid #dce6f2',
            borderRadius: 12,
            padding: 20,
            background: '#ffffff',
            boxShadow: '0 2px 6px rgba(15, 43, 85, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 10,
                background: '#f1f5f9',
                color: '#475569',
                marginBottom: 12
              }}>
                <FileText size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: '#0f2b55' }}>
                Download Category Template
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: '#667892', lineHeight: 1.5 }}>
                Download a clean blank CSV containing only the exact columns configured for &quot;{selectedCat?.name || 'Category'}&quot;.
              </p>
            </div>

            <button
              type="button"
              className="btn"
              style={{
                marginTop: 18,
                width: '100%',
                justifyContent: 'center',
                fontWeight: 700,
                borderColor: '#2563eb',
                color: '#2563eb'
              }}
              onClick={handleDownloadTemplate}
              disabled={!selectedCat}
            >
              <Download size={15} style={{ marginRight: 6 }} />
              Download &quot;{selectedCat?.name || 'Category'}&quot; Template
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
