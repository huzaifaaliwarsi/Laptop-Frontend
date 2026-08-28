'use client';

import React, { useState, useEffect } from 'react';
import { Store } from 'lucide-react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import AddProductModal from '../../components/modules/inventory/AddProductModal';
import EditProductModal from '../../components/modules/inventory/EditProductModal';
import StockAdjustmentModal from '../../components/modules/inventory/StockAdjustmentModal';
import VendorReturnModal from '../../components/modules/inventory/VendorReturnModal';
import BulkCsvModal from '../../components/modules/inventory/BulkCsvModal';
import ProductHistoryModal from '../../components/modules/inventory/ProductHistoryModal';
import ManageCategoriesModal from '../../components/common/ManageCategoriesModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkCsvOpen, setIsBulkCsvOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [returnProduct, setReturnProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  const loadProducts = () => {
    setLoading(true);
    let url = '/products?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

    Promise.all([
      api.get(url),
      api.get('/categories')
    ]).then(([pRes, cRes]) => {
      if (pRes.success) setProducts(pRes.data || []);
      if (cRes.success) setCategories(cRes.data.productCategories || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();

    const handleCategoryUpdate = () => {
      loadProducts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('app:categories-updated', handleCategoryUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:categories-updated', handleCategoryUpdate);
      }
    };
  }, [search, categoryFilter, statusFilter]);

  const handleDeleteProduct = async (prod) => {
    if (!confirm(`Delete product ${prod.code} (${prod.brand} ${prod.model}) from inventory?`)) return;
    try {
      const res = await api.delete(`/products/${prod.id}`);
      if (res.success) {
        toast('Product deleted from inventory');
        loadProducts();
      }
    } catch (err) {
      toast(err.message || 'Error deleting product', 'error');
    }
  };

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              <input
                className="input search"
                style={{ maxWidth: 320 }}
                placeholder="Search code, brand, model, supplier, specs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                style={{ width: 170 }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>
                ))}
              </select>
              <select
                className="select"
                style={{ width: 150 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Stock Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIsManageCategoriesOpen(true)}
                title="Manage categories stored in database"
              >
                <Icon name="tag" /> Categories
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setIsBulkCsvOpen(true)}
                  >
                    <Icon name="upload" /> Bulk CSV
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setIsAddOpen(true)}
                  >
                    <Icon name="plus" /> + Add Product
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Brand & Model</th>
                  <th>Specifications / Details</th>
                  <th>Condition</th>
                  <th style={{ textAlign: 'right' }}>Current Stock</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Cost Price</th>}
                  <th style={{ textAlign: 'right' }}>Expected Sale</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      Loading inventory products...
                    </td>
                  </tr>
                ) : products.length > 0 ? (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.code}</strong></td>
                      <td>{p.categoryName}</td>
                      <td>
                        <div><strong>{p.brand}</strong> {p.model || p.productName}</div>
                        {(p.vendorName || p.sourceName) && (p.vendorName !== 'Manual Entry' && p.sourceName !== 'Manual Entry') && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span title="Supplier / Vendor" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Store size={12} /> {p.vendorName || p.sourceName}
                            </span>
                            {p.purchaseInvoiceNo && p.purchaseInvoiceNo !== 'MANUAL' && (
                              <span style={{ opacity: 0.8 }} title="Purchase Invoice / Bill No.">({p.purchaseInvoiceNo})</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ maxWidth: 300, fontSize: 10, color: 'var(--muted)' }}>
                        {p.specifications || '—'}
                      </td>
                      <td><span className="badge">{p.condition}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: p.currentStock <= p.lowStockAlert ? 'var(--danger)' : 'var(--text)' }}>
                        {p.currentStock}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>{money(p.costPrice)}</td>
                      )}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>
                        {money(p.expectedSalePrice || (p.costPrice * 1.15))}
                      </td>
                      <td>
                        <span className={`badge ${
                          p.currentStock === 0 ? 'danger' :
                          p.currentStock <= p.lowStockAlert ? 'warning' : 'success'
                        }`}>
                          {p.currentStock === 0 ? 'Out of Stock' : p.currentStock <= p.lowStockAlert ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="icon-action"
                            title="Stock Movement Ledger"
                            onClick={() => setHistoryProduct(p)}
                          >
                            <Icon name="book" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                className="icon-action"
                                title="Adjust Stock Quantity"
                                onClick={() => setAdjustProduct(p)}
                              >
                                <Icon name="refresh" />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                title="Return to Vendor"
                                onClick={() => setReturnProduct(p)}
                              >
                                <Icon name="truck" />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                title="Edit Product"
                                onClick={() => setEditProduct(p)}
                              >
                                <Icon name="edit" />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                title="Delete"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDeleteProduct(p)}
                              >
                                <Icon name="trash" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No inventory items found. Click &ldquo;+ Add Product&rdquo; or &ldquo;Bulk CSV Import&rdquo; to populate stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => loadProducts()}
      />

      <EditProductModal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
        onSuccess={() => loadProducts()}
      />

      <StockAdjustmentModal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
        onSuccess={() => loadProducts()}
      />

      <VendorReturnModal
        isOpen={!!returnProduct}
        onClose={() => setReturnProduct(null)}
        product={returnProduct}
        onSuccess={() => loadProducts()}
      />

      <BulkCsvModal
        isOpen={isBulkCsvOpen}
        onClose={() => setIsBulkCsvOpen(false)}
        onSuccess={() => loadProducts()}
      />

      <ProductHistoryModal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />

      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onCategoriesUpdated={() => loadProducts()}
      />
    </>
  );
}
