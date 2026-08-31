'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Store, Laptop, Cpu, Plus, RefreshCw, Trash2, Edit } from 'lucide-react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import AddProductModal from '../../components/modules/inventory/AddProductModal';
import EditProductModal from '../../components/modules/inventory/EditProductModal';
import StockAdjustmentModal from '../../components/modules/inventory/StockAdjustmentModal';
import VendorReturnModal from '../../components/modules/inventory/VendorReturnModal';
import BulkCsvModal from '../../components/modules/inventory/BulkCsvModal';
import ProductHistoryModal from '../../components/modules/inventory/ProductHistoryModal';
import ManageCategoriesModal from '../../components/common/ManageCategoriesModal';
import RepairPartModal from '../../components/modules/repairs/RepairPartModal';
import AdjustSparePartStockModal from '../../components/modules/repairs/AdjustSparePartStockModal';
import RepairPartHistoryModal from '../../components/modules/repairs/RepairPartHistoryModal';
import { TableRowSkeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

const SPARE_PART_CATEGORIES = [
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

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  // Active Tab: 'products' | 'spare-parts'
  const [activeTab, setActiveTab] = useState('products');

  // --- 1. Retail Products State ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Retail Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isBulkCsvOpen, setIsBulkCsvOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [returnProduct, setReturnProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  // --- 2. Workshop Spare Parts State ---
  const [spareParts, setSpareParts] = useState([]);
  const [partSearch, setPartSearch] = useState('');
  const [partCategoryFilter, setPartCategoryFilter] = useState('');
  const [partStatusFilter, setPartStatusFilter] = useState('');
  const [loadingParts, setLoadingParts] = useState(false);

  // Spare Parts Modals & Selection
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [editPart, setEditPart] = useState(null);
  const [adjustPart, setAdjustPart] = useState(null);
  const [historyPart, setHistoryPart] = useState(null);
  const [selectedPartIds, setSelectedPartIds] = useState([]);

  // Load Retail Products
  const loadProducts = useCallback(() => {
    setLoadingProducts(true);
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
    .finally(() => setLoadingProducts(false));
  }, [search, categoryFilter, statusFilter]);

  // Load Workshop Spare Parts
  const loadSpareParts = useCallback(() => {
    setLoadingParts(true);
    let url = '/repair-parts?';
    if (partSearch) url += `search=${encodeURIComponent(partSearch)}&`;
    if (partCategoryFilter) url += `category=${encodeURIComponent(partCategoryFilter)}&`;
    if (partStatusFilter) {
      if (partStatusFilter === 'In Stock') url += 'inStockOnly=true&';
      else if (partStatusFilter === 'Low Stock') url += 'lowStockOnly=true&';
      else if (partStatusFilter === 'Active' || partStatusFilter === 'Inactive') url += `status=${encodeURIComponent(partStatusFilter)}&`;
    }

    api.get(url)
      .then(res => {
        if (res.success) setSpareParts(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingParts(false));
  }, [partSearch, partCategoryFilter, partStatusFilter]);

  const handleToggleSelectPart = (id) => {
    setSelectedPartIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllParts = () => {
    if (selectedPartIds.length === spareParts.length) {
      setSelectedPartIds([]);
    } else {
      setSelectedPartIds(spareParts.map(p => p.id));
    }
  };

  const handleBulkDeleteParts = async () => {
    if (!selectedPartIds.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedPartIds.length} selected spare part(s)?`)) return;
    try {
      const res = await api.post('/repair-parts/bulk-delete', { ids: selectedPartIds });
      if (res.success) {
        toast(res.message || 'Selected spare parts deleted');
        setSelectedPartIds([]);
        loadSpareParts();
      }
    } catch (err) {
      toast(err.message || 'Error deleting spare parts', 'error');
    }
  };

  const handleDeleteAllParts = async () => {
    if (spareParts.length === 0) return;
    const code = prompt(`WARNING: This will permanently delete ALL ${spareParts.length} workshop spare parts from your catalog!\n\nType "DELETE ALL" to confirm:`);
    if (code !== 'DELETE ALL') {
      if (code !== null) toast('Deletion cancelled. Confirmation text did not match.', 'error');
      return;
    }
    try {
      const res = await api.delete('/repair-parts/all/wipe');
      if (res.success) {
        toast(res.message || 'All spare parts deleted successfully');
        setSelectedPartIds([]);
        loadSpareParts();
      }
    } catch (err) {
      toast(err.message || 'Error deleting all spare parts', 'error');
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (activeTab === 'spare-parts') {
      loadSpareParts();
    }
  }, [activeTab, loadSpareParts]);

  useEffect(() => {
    const handleCategoryUpdate = () => {
      loadProducts();
    };

    const handlePartsUpdate = () => {
      loadSpareParts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('app:categories-updated', handleCategoryUpdate);
      window.addEventListener('app:repair-parts-updated', handlePartsUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:categories-updated', handleCategoryUpdate);
        window.removeEventListener('app:repair-parts-updated', handlePartsUpdate);
      }
    };
  }, [loadProducts, loadSpareParts]);

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

  const handleDeletePart = async (part) => {
    if (!confirm(`Are you sure you want to delete spare part "${part.name}" (${part.code})?`)) return;
    try {
      const res = await api.delete(`/repair-parts/${part.id}`);
      if (res.success) {
        toast('Spare part deleted successfully');
        loadSpareParts();
      }
    } catch (err) {
      toast(err.message || 'Error deleting spare part', 'error');
    }
  };

  // Metrics calculation
  const totalRetailUnits = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalRetailCost = products.reduce((sum, p) => sum + ((p.currentStock || 0) * (parseFloat(p.costPrice) || 0)), 0);

  const totalSpareUnits = spareParts.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalSpareCost = spareParts.reduce((sum, p) => sum + ((p.currentStock || 0) * (parseFloat(p.costPrice) || 0)), 0);

  return (
    <>
      {/* ── Top Tabs Navigation ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '6px 8px',
        marginBottom: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
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
              background: activeTab === 'products' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
              color: activeTab === 'products' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'products' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setActiveTab('products')}
          >
            <Laptop size={16} />
            <span>1. Retail Products Inventory</span>
            <span style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 10,
              background: activeTab === 'products' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'products' ? '#ffffff' : '#475569',
              fontWeight: 800
            }}>
              {products.length}
            </span>
          </button>

          <button
            type="button"
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
              background: activeTab === 'spare-parts' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
              color: activeTab === 'spare-parts' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'spare-parts' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setActiveTab('spare-parts')}
          >
            <Cpu size={16} />
            <span>2. Workshop Repair Spare Parts</span>
            <span style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 10,
              background: activeTab === 'spare-parts' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'spare-parts' ? '#ffffff' : '#475569',
              fontWeight: 800
            }}>
              {spareParts.length}
            </span>
          </button>
        </div>

        {/* Global Tab Stats Badge */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingRight: 8 }}>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            {activeTab === 'products' ? (
              <span>Active Stock: <strong>{totalRetailUnits} units</strong> ({money(totalRetailCost)})</span>
            ) : (
              <span>Active Parts: <strong>{totalSpareUnits} units</strong> ({money(totalSpareCost)})</span>
            )}
          </span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: RETAIL PRODUCTS INVENTORY
          ========================================================================= */}
      {activeTab === 'products' && (
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
                      onClick={() => setIsAddProductOpen(true)}
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
                  {loadingProducts ? (
                    <TableRowSkeleton cols={10} rows={6} />
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
      )}

      {/* =========================================================================
          TAB 2: WORKSHOP REPAIR SPARE PARTS INVENTORY
          ========================================================================= */}
      {activeTab === 'spare-parts' && (
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                <input
                  className="input search"
                  style={{ maxWidth: 320 }}
                  placeholder="Search SKU code, part name, compatible laptop model..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                />
                <select
                  className="select"
                  style={{ width: 180 }}
                  value={partCategoryFilter}
                  onChange={(e) => setPartCategoryFilter(e.target.value)}
                >
                  <option value="">All Spare Categories</option>
                  {SPARE_PART_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  className="select"
                  style={{ width: 150 }}
                  value={partStatusFilter}
                  onChange={(e) => setPartStatusFilter(e.target.value)}
                >
                  <option value="">All Stock Status</option>
                  <option value="In Stock">In Stock (Available)</option>
                  <option value="Low Stock">Low Stock Alert</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive / Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedPartIds.length > 0 && (
                  <button
                    type="button"
                    className="btn danger"
                    onClick={handleBulkDeleteParts}
                    style={{ background: '#dc2626', color: '#ffffff', fontWeight: 700 }}
                  >
                    <Trash2 size={13} /> Delete Selected ({selectedPartIds.length})
                  </button>
                )}
                {isAdmin && spareParts.length > 0 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={handleDeleteAllParts}
                    style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
                    title="Permanently wipe all workshop spare parts"
                  >
                    <Trash2 size={13} /> Delete All
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={loadSpareParts}
                  title="Refresh Spare Parts Catalog"
                >
                  <RefreshCw size={13} className={loadingParts ? 'animate-spin' : ''} /> Refresh
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setIsAddPartOpen(true)}
                >
                  <Plus size={14} /> + Add Spare Part
                </button>
              </div>
            </div>
          </div>

          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={spareParts.length > 0 && selectedPartIds.length === spareParts.length}
                        onChange={handleToggleSelectAllParts}
                        title="Select All Spare Parts"
                      />
                    </th>
                    <th>Part SKU / Code</th>
                    <th>Category</th>
                    <th>Part Name & Specifications</th>
                    <th>Compatible Laptop Models</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Cost Price</th>}
                    <th style={{ textAlign: 'right' }}>Customer Price</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingParts ? (
                    <TableRowSkeleton cols={10} rows={6} />
                  ) : spareParts.length > 0 ? (
                    spareParts.map((part) => {
                      const stock = parseInt(part.currentStock || 0, 10);
                      const isLow = stock <= (part.minStockAlert || 2);
                      const isOut = stock === 0;
                      const isSelected = selectedPartIds.includes(part.id);

                      return (
                        <tr key={part.id} style={{ background: isSelected ? '#f8fafc' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectPart(part.id)}
                            />
                          </td>
                          <td><strong>{part.code}</strong></td>
                          <td>
                            <span className="badge" style={{ fontSize: 11, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                              {part.category}
                            </span>
                          </td>
                          <td>
                            <strong>{part.name}</strong>
                          </td>
                          <td style={{ maxWidth: 280, fontSize: 11, color: 'var(--muted)' }}>
                            {part.compatibleModels || 'Universal / Multi-model'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#15803d' }}>
                            {stock} units
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>{money(part.costPrice)}</td>
                          )}
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>
                            {money(part.sellingPrice)}
                          </td>
                          <td>
                            <span className={`badge ${
                              part.status === 'Inactive' ? 'muted' :
                              isOut ? 'danger' : isLow ? 'warning' : 'success'
                            }`}>
                              {part.status === 'Inactive' ? 'Inactive' : isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="icon-action"
                                title="Spare Part Movement Ledger"
                                onClick={() => setHistoryPart(part)}
                              >
                                <Icon name="book" />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                title="Adjust Stock (Restock / Write-off)"
                                onClick={() => setAdjustPart(part)}
                              >
                                <RefreshCw size={13} />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                title="Edit Spare Part"
                                onClick={() => setEditPart(part)}
                              >
                                <Edit size={13} />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="icon-action"
                                  title="Delete Spare Part"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleDeletePart(part)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: 36, color: 'var(--muted)' }}>
                        No workshop spare parts found. Click &ldquo;+ Add Spare Part&rdquo; to add screens, batteries, keyboards, ICs, or RAM/SSD to catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Retail Products Modals */}
      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
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

      {/* 2. Workshop Spare Parts Modals */}
      <RepairPartModal
        isOpen={isAddPartOpen}
        onClose={() => setIsAddPartOpen(false)}
        onSuccess={() => loadSpareParts()}
      />

      <RepairPartModal
        isOpen={!!editPart}
        onClose={() => setEditPart(null)}
        part={editPart}
        onSuccess={() => loadSpareParts()}
      />

      <AdjustSparePartStockModal
        isOpen={!!adjustPart}
        onClose={() => setAdjustPart(null)}
        part={adjustPart}
        onSuccess={() => loadSpareParts()}
      />

      <RepairPartHistoryModal
        isOpen={!!historyPart}
        onClose={() => setHistoryPart(null)}
        part={historyPart}
      />
    </>
  );
}
