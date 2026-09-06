'use client';

import React, { useState, useMemo } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';

const SAMPLE_CSV = `category,brand,model,specifications,condition,quantity,costPrice,expectedSalePrice,lowStockAlert
Laptop,Dell,Latitude 5400,Core i5 8th • 16GB • 256GB SSD,Used,5,48000,56000,2
Laptop,HP,EliteBook 840 G5,Core i5 8th • 8GB • 256GB SSD,Used,3,51000,59000,1
Accessories,Logitech,Wireless Mouse,2.4GHz USB Nano,New,10,1200,1800,3`;

const BLANK_TEMPLATE_CSV = `category,brand,model,specifications,condition,quantity,costPrice,expectedSalePrice,lowStockAlert
Laptop,BrandName,ModelName,Processor • RAM • Storage,Used,1,50000,60000,1`;

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

export default function BulkCsvModal({
  isOpen,
  onClose,
  onSuccess,
  products = []
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Live client-side parsing for instant visual feedback
  const parsedPreview = useMemo(() => {
    if (!csvText.trim()) return { count: 0, items: [] };
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { count: 0, items: [] };

    // Split single line respecting quotes
    const splitLine = (line) => {
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
        } else if (c === ',' && !inQuotes) {
          res.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      res.push(cur.trim());
      return res;
    };

    const rawHeaders = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const headerMap = {
      category: ['category', 'categoryname', 'cat'],
      brand: ['brand', 'make'],
      model: ['model', 'modelname', 'productname'],
      specifications: ['specifications', 'specs', 'details', 'description'],
      condition: ['condition', 'state'],
      quantity: ['quantity', 'qty', 'stock', 'count'],
      costPrice: ['costprice', 'cost', 'purchaseprice'],
      expectedSalePrice: ['expectedsaleprice', 'saleprice', 'price', 'sellingprice'],
      lowStockAlert: ['lowstockalert', 'lowstock', 'alert']
    };

    const indices = {};
    for (const [field, aliases] of Object.entries(headerMap)) {
      const idx = rawHeaders.findIndex(h => aliases.includes(h));
      if (idx !== -1) indices[field] = idx;
    }

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = splitLine(lines[i]);
      if (!vals.some(Boolean)) continue;
      const category = vals[indices.category] || vals[0] || '';
      const brand = vals[indices.brand] || vals[1] || '';
      const model = vals[indices.model] || vals[2] || '';
      const specifications = vals[indices.specifications] || vals[3] || '';
      const condition = vals[indices.condition] || vals[4] || 'Used';
      const quantity = parseInt(vals[indices.quantity] || vals[5] || '0', 10);
      const costPrice = parseFloat(vals[indices.costPrice] || vals[6] || '0');
      const expectedSalePrice = parseFloat(vals[indices.expectedSalePrice] || vals[7] || '0');

      if (category && brand && model && quantity > 0) {
        items.push({
          category,
          brand,
          model,
          specifications,
          condition,
          quantity,
          costPrice,
          expectedSalePrice
        });
      }
    }
    return { count: items.length, items };
  }, [csvText]);

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
    toast('Sample CSV loaded. You can edit values or click Start Import.');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setCsvText(text);
      toast(`File "${file.name}" loaded ready for review!`, 'success');
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      toast('Paste CSV content or upload a CSV file', 'error');
      return;
    }

    if (parsedPreview.count === 0) {
      toast('No valid product rows detected. Please check columns.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/products/bulk-csv', {
        csvText,
        products: parsedPreview.items
      });
      if (res.success) {
        toast(`Import successful: ${res.data?.imported || parsedPreview.count} product(s) processed!`);
        setCsvText('');
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
      // 1. Try server-side export endpoint
      const res = await api.get('/products/export-csv');
      if (typeof res === 'string' && res.includes(',')) {
        triggerCsvDownload(res, `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`);
        toast('Inventory CSV downloaded successfully!', 'success');
        return;
      }

      // 2. Client-side fallback if in-memory list exists
      const list = products.length > 0 ? products : [];
      if (list.length === 0) {
        toast('No products found to export.', 'error');
        return;
      }

      const headers = [
        'Product Code',
        'Category',
        'Brand',
        'Model',
        'Specifications',
        'Condition',
        'Current Stock',
        'Cost Price',
        'Expected Sale Price',
        'Low Stock Alert',
        'Source / Supplier'
      ];

      const escapeCell = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = [headers.map(escapeCell).join(',')];
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
          p.lowStockAlert || 1,
          p.sourceName || ''
        ].map(escapeCell).join(','));
      }

      triggerCsvDownload(rows.join('\r\n'), `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast('Inventory CSV downloaded successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to export inventory CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadBlankTemplate = () => {
    triggerCsvDownload(BLANK_TEMPLATE_CSV, 'inventory-import-template.csv');
    toast('Blank CSV Template downloaded. Fill it in Excel and upload!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Inventory CSV Manager"
      subtitle="Import new products or export full current inventory to Excel/CSV"
      wide={true}
      footer={
        activeTab === 'import' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {parsedPreview.count > 0 ? (
                <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={14} /> Ready to import: {parsedPreview.count} item(s)
                </span>
              ) : csvText.trim() ? (
                <span style={{ color: '#e11d48', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={14} /> No valid items detected. Check required fields.
                </span>
              ) : (
                <span>Upload a .csv file or paste raw rows to begin</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                form="bulkCsvImportForm"
                className="btn primary"
                disabled={submitting || parsedPreview.count === 0}
              >
                {submitting ? 'Processing...' : `Start Import (${parsedPreview.count})`}
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
            gap: 7,
            padding: '7px 16px',
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
          <Upload size={14} />
          <span>1. Import Products via CSV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 16px',
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
          <Download size={14} />
          <span>2. Export Inventory & Templates</span>
        </button>
      </div>

      {/* ── TAB 1: IMPORT ── */}
      {activeTab === 'import' && (
        <form id="bulkCsvImportForm" onSubmit={handleImportSubmit}>
          <div className="form-grid">
            <div className="field span-12">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                  CSV File or Raw Text Data *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="csvFileInputModal"
                  />
                  <label htmlFor="csvFileInputModal" className="btn small" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Upload size={13} /> Upload .CSV File
                  </label>
                  <button type="button" className="btn small soft" onClick={handleLoadSample}>
                    Load Sample CSV
                  </button>
                </div>
              </div>

              <textarea
                className="textarea"
                style={{
                  minHeight: 180,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: '1.5',
                  padding: 10,
                  borderRadius: 8,
                  borderColor: parsedPreview.count > 0 ? '#86efac' : '#cbd5e1'
                }}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="category,brand,model,specifications,condition,quantity,costPrice,expectedSalePrice,lowStockAlert"
                required
              />
            </div>

            {/* Quick Live Preview Table if rows are detected */}
            {parsedPreview.items.length > 0 && (
              <div className="span-12" style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>
                    Validated Preview ({parsedPreview.items.length} items ready):
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Showing first {Math.min(parsedPreview.items.length, 3)} rows
                  </span>
                </div>
                <div style={{
                  maxHeight: 120,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  background: '#f8fafc',
                  fontSize: 11.5
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0', color: '#334155', textAlign: 'left' }}>
                        <th style={{ padding: '4px 8px' }}>Category</th>
                        <th style={{ padding: '4px 8px' }}>Brand</th>
                        <th style={{ padding: '4px 8px' }}>Model</th>
                        <th style={{ padding: '4px 8px' }}>Qty</th>
                        <th style={{ padding: '4px 8px' }}>Cost</th>
                        <th style={{ padding: '4px 8px' }}>Sale Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.items.slice(0, 3).map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 8px' }}>{item.category}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 600 }}>{item.brand}</td>
                          <td style={{ padding: '4px 8px' }}>{item.model}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 700, color: '#2563eb' }}>{item.quantity}</td>
                          <td style={{ padding: '4px 8px' }}>{item.costPrice}</td>
                          <td style={{ padding: '4px 8px' }}>{item.expectedSalePrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="span-12 callout" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 2 }}>
                Required Columns:
              </div>
              <code style={{ fontSize: 11, color: '#0f172a', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                category, brand, model, specifications, condition, quantity, costPrice, expectedSalePrice, lowStockAlert
              </code>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 0 }}>
                💡 Matching products (same Category + Brand + Model + Specs) will <strong>automatically merge</strong> quantity into the existing code. New products will automatically receive a unique code!
              </p>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 2: EXPORT ── */}
      {activeTab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, padding: '8px 0' }}>
          {/* Card 1: Full Inventory Export */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: 16,
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#dbeafe',
                color: '#1d4ed8',
                marginBottom: 10
              }}>
                <FileSpreadsheet size={20} />
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Export Full Inventory (.CSV)
              </h4>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                Download complete active branch stock including Product Code, Specs, Current Stock, Cost, Sale Price, and Supplier.
              </p>
            </div>

            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
              onClick={handleDownloadCurrentInventory}
              disabled={exporting}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              {exporting ? 'Generating CSV...' : 'Download Current Stock CSV'}
            </button>
          </div>

          {/* Card 2: Blank Template Download */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: 16,
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#f1f5f9',
                color: '#475569',
                marginBottom: 10
              }}>
                <FileText size={20} />
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Download Blank Import Template (.CSV)
              </h4>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                Download a clean, pre-formatted CSV template ready to open in Microsoft Excel or Google Sheets, fill in new stock, and upload.
              </p>
            </div>

            <button
              type="button"
              className="btn"
              style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
              onClick={handleDownloadBlankTemplate}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              Download Blank Template
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
