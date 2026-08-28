'use client';

import React, { useState, useEffect } from 'react';
import { Store, Phone, MapPin } from 'lucide-react';
import Modal from '../../common/Modal';
import CommonProductFields from '../../common/CommonProductFields';
import QuickAddVendorModal from '../../common/QuickAddVendorModal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function EditProductModal({
  isOpen,
  onClose,
  product,
  onSuccess
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    brand: '',
    model: '',
    others: '',
    condition: 'Used',
    lowStockAlert: 1,
    costPrice: '',
    expectedSalePrice: '',
    remarks: '',
    vendorId: '',
    vendorName: '',
    purchaseInvoiceNo: ''
  });

  const loadInitialData = () => {
    Promise.all([
      api.get('/categories'),
      api.get('/vendors')
    ])
      .then(([cRes, vRes]) => {
        if (cRes.success) setCategories(cRes.data.productCategories || []);
        if (vRes.success) setVendors(vRes.data || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen && product) {
      loadInitialData();

      const handleCategoryUpdate = () => {
        loadInitialData();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('app:categories-updated', handleCategoryUpdate);
      }

      setFormData({
        category: product.category || product.categoryName || '',
        brand: product.brand || '',
        model: product.model || product.productName || '',
        others: product.specifications || '',
        condition: product.condition || 'Used',
        lowStockAlert: product.lowStockAlert || 1,
        costPrice: product.costPrice || '',
        expectedSalePrice: product.expectedSalePrice || '',
        remarks: product.remarks || '',
        vendorId: product.vendorId || product.sourceId || '',
        vendorName: product.vendorName || product.sourceName || '',
        purchaseInvoiceNo: product.purchaseInvoiceNo || ''
      });

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('app:categories-updated', handleCategoryUpdate);
        }
      };
    }
  }, [isOpen, product]);

  const handleFieldChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleVendorSelect = (e) => {
    const val = e.target.value;
    if (val === '__add__') {
      setIsAddVendorOpen(true);
      return;
    }
    if (!val) {
      setFormData(prev => ({ ...prev, vendorId: '', vendorName: '' }));
      return;
    }
    const found = vendors.find(v => v.id === val);
    if (found) {
      setFormData(prev => ({
        ...prev,
        vendorId: found.id,
        vendorName: found.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vendorId: '',
        vendorName: val
      }));
    }
  };

  const handleVendorCreated = (newVendor) => {
    setVendors(prev => {
      const exists = prev.some(v => v.id === newVendor.id);
      return exists ? prev : [newVendor, ...prev];
    });
    setFormData(prev => ({
      ...prev,
      vendorId: newVendor.id,
      vendorName: newVendor.name
    }));
  };

  const selectedVendor = vendors.find(v => v.id === formData.vendorId || (formData.vendorName && v.name === formData.vendorName));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    setSubmitting(true);
    try {
      const payload = {
        category: formData.category || formData.categoryName,
        categoryName: formData.category || formData.categoryName,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        specifications: formData.others,
        condition: formData.condition,
        lowStockAlert: parseInt(formData.lowStockAlert || 1, 10),
        costPrice: parseFloat(formData.costPrice || 0),
        expectedSalePrice: parseFloat(formData.expectedSalePrice || 0),
        remarks: formData.remarks,
        vendorId: formData.vendorId || null,
        vendorName: formData.vendorName || null,
        purchaseInvoiceNo: formData.purchaseInvoiceNo || null
      };

      const res = await api.put(`/products/${product.id}`, payload);
      if (res.success) {
        toast(`Product ${product.code} updated successfully!`);
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error updating product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Product Details"
        subtitle={product ? `Item Code: ${product.code} (Stock: ${product.currentStock})` : ''}
        wide={true}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="editProductForm"
              className="btn primary"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Product'}
            </button>
          </>
        }
      >
        <form id="editProductForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <CommonProductFields
              values={formData}
              onChange={handleFieldChange}
              categories={categories}
            />

            {/* Supplier / Vendor Section */}
            <div className="span-12" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                  <Store size={16} /> Supplier / Vendor Information
                </label>
                <button
                  type="button"
                  className="btn small soft"
                  style={{ fontSize: 12, padding: '3px 10px' }}
                  onClick={() => setIsAddVendorOpen(true)}
                >
                  + Add New Supplier
                </button>
              </div>

              <div className="form-grid">
                <div className="field span-7">
                  <label>Supplier / Vendor</label>
                  <select
                    className="select"
                    value={formData.vendorId || ''}
                    onChange={handleVendorSelect}
                  >
                    <option value="">-- No Vendor / General Stock --</option>
                    <option value="__add__" style={{ fontWeight: 700, color: 'var(--primary)' }}>+ Add New Supplier / Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.contact ? `(${v.contact})` : ''} {v.address ? `• ${v.address}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field span-5">
                  <label>Purchase Bill / Invoice #</label>
                  <input
                    className="input"
                    value={formData.purchaseInvoiceNo || ''}
                    onChange={(e) => handleFieldChange('purchaseInvoiceNo', e.target.value)}
                    placeholder="e.g. INV-9801 / Ref"
                  />
                </div>

                {selectedVendor && (
                  <div className="span-12" style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 4, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span><strong>Selected Supplier:</strong> {selectedVendor.name}</span>
                    {selectedVendor.contact && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} /> <strong>Phone:</strong> {selectedVendor.contact}
                      </span>
                    )}
                    {selectedVendor.address && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> <strong>Address:</strong> {selectedVendor.address}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Add Vendor Modal */}
      <QuickAddVendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onSuccess={handleVendorCreated}
      />
    </>
  );
}
