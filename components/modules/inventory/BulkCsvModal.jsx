'use client';

import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

const SAMPLE_CSV = `category,brand,model,specifications,condition,quantity,costPrice,expectedSalePrice,lowStockAlert
Laptop,Dell,Latitude 5400,Core i5 8th • 16GB • 256GB SSD,Used,5,48000,56000,2
Laptop,HP,EliteBook 840 G5,Core i5 8th • 8GB • 256GB SSD,Used,3,51000,59000,1
Accessories,Logitech,Wireless Mouse,2.4GHz USB Nano,New,10,1200,1800,3`;

export default function BulkCsvModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      toast('Paste CSV content or upload a CSV file', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/products/bulk-csv', { csvText });
      if (res.success) {
        toast(`Bulk import successful: ${res.data.imported} products processed!`);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error processing CSV import', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Inventory via CSV"
      subtitle="Import multiple items with automatic signature deduplication and merging"
      wide={true}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="bulkCsvForm"
            className="btn primary"
            disabled={submitting || !csvText.trim()}
          >
            {submitting ? 'Importing...' : 'Start Import'}
          </button>
        </>
      }
    >
      <form id="bulkCsvForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>CSV Text Data *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="csvFileInput"
                />
                <label htmlFor="csvFileInput" className="btn small">
                  Upload CSV File
                </label>
                <button type="button" className="btn small soft" onClick={handleLoadSample}>
                  Load Sample CSV
                </button>
              </div>
            </div>
            <textarea
              className="textarea"
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 11 }}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="category,brand,model,specifications,condition,quantity,costPrice,expectedSalePrice,lowStockAlert"
              required
            />
          </div>

          <div className="span-12 callout">
            <strong>CSV Column Format:</strong>
            <br />
            <code>category, brand, model, specifications, condition, quantity, costPrice, expectedSalePrice, lowStockAlert</code>
            <br />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              Matching composite keys (Category + Brand + Model + Specifications) will automatically merge stock into existing codes.
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
