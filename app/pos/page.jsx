'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import SalesInvoiceModal from '../../components/modules/pos/SalesInvoiceModal';
import CustomSaleModal from '../../components/modules/pos/CustomSaleModal';
import CustomerPurchaseModal from '../../components/modules/pos/CustomerPurchaseModal';
import ExchangeModal from '../../components/modules/pos/ExchangeModal';
import InvoicePreviewModal from '../../components/modules/invoice/InvoicePreviewModal';
import { useToast } from '../../components/common/Toast';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function PosPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  const [products, setProducts] = useState([]);
  const [heldBills, setHeldBills] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isCustomSaleOpen, setIsCustomSaleOpen] = useState(false);
  const [isCustPurchaseOpen, setIsCustPurchaseOpen] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/products?inStockOnly=true'),
      api.get('/categories'),
      api.get('/pos/held-bills')
    ]).then(([pRes, cRes, hRes]) => {
      if (pRes.success) setProducts(pRes.data || []);
      if (cRes.success) {
        const prodCats = cRes.data.productCategories || [];
        const defaultCats = ['Laptop', 'LCD / Screen', 'Accessories', 'PC', 'All-in-One'];
        const mergedCats = Array.from(new Set([
          ...defaultCats,
          ...prodCats.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean)
        ]));
        setCategories(mergedCats);
      }
      if (hRes.success) setHeldBills(hRes.data || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter(p => {
    const s = search.trim().toLowerCase();
    const pCat = (p.category || p.categoryName || '').toLowerCase();
    const matchesSearch = !s ||
      p.code?.toLowerCase().includes(s) ||
      p.brand?.toLowerCase().includes(s) ||
      p.model?.toLowerCase().includes(s) ||
      p.productName?.toLowerCase().includes(s) ||
      p.specifications?.toLowerCase().includes(s);
    const matchesCategory = !categoryFilter || pCat === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleProductCardClick = (prod) => {
    setSelectedProductForSale(prod);
    setIsSaleOpen(true);
  };

  const handleDiscardHeld = async (id) => {
    if (!confirm('Discard this held bill?')) return;
    try {
      const res = await api.delete(`/pos/held-bills/${id}`);
      if (res.success) {
        toast('Held bill discarded');
        loadData();
      }
    } catch (err) {
      toast(err.message || 'Error discarding bill', 'error');
    }
  };

  return (
    <>
      <div className="pos-workspace">
        <div className="pos-main">
          {/* POS Selector Banner */}
          <div className="pos-toolbar">
            <div className="pos-type-switch">
              <button
                type="button"
                className="pos-type-btn active"
                onClick={() => {
                  setSelectedProductForSale(null);
                  setIsSaleOpen(true);
                }}
              >
                <span className="pos-type-icon"><Icon name="cart" /></span>
                <div>
                  <strong>Sales Invoice</strong>
                  <small>Stock POS Checkout</small>
                </div>
              </button>

              <button
                type="button"
                className="pos-type-btn"
                onClick={() => setIsCustomSaleOpen(true)}
              >
                <span className="pos-type-icon"><Icon name="zap" /></span>
                <div>
                  <strong>Custom Sale</strong>
                  <small>Direct Sourced (No Stock)</small>
                </div>
              </button>

              <button
                type="button"
                className="pos-type-btn"
                onClick={() => setIsCustPurchaseOpen(true)}
              >
                <span className="pos-type-icon"><Icon name="package" /></span>
                <div>
                  <strong>Buyback Purchase</strong>
                  <small>Customer Trade-In</small>
                </div>
              </button>

              <button
                type="button"
                className="pos-type-btn"
                onClick={() => setIsExchangeOpen(true)}
              >
                <span className="pos-type-icon"><Icon name="refresh" /></span>
                <div>
                  <strong>Product Exchange</strong>
                  <small>1-to-1 Trade & Settle</small>
                </div>
              </button>
            </div>

            {/* Catalog Search & Category Filter */}
            <div className="pos-search-row">
              <input
                className="input search"
                placeholder="Search live stock catalog by code, brand, model or processor..."
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
            </div>
          </div>

          {/* Product Cards Catalog */}
          <div className="pos-catalog-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px' }}>
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--navy)' }}>
                Available Products ({filteredProducts.length})
              </h3>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                Click any product to select in Sales Invoice
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading products...</div>
            ) : filteredProducts.length > 0 ? (
              <div className="pos-catalog-grid">
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    className="pos-item-card"
                    onClick={() => handleProductCardClick(p)}
                  >
                    <span className="item-stock">{p.currentStock} in stock</span>
                    <span className="item-code">{p.code}</span>
                    <div className="item-name">{p.brand} {p.model || p.productName}</div>
                    <div className="item-meta">{p.specifications || p.condition || 'Product'}</div>
                    <div className="item-price">{money(p.expectedSalePrice || p.costPrice)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel" style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                No matching in-stock products found.
              </div>
            )}
          </div>
        </div>

        {/* Right-Side POS Desk & Held Bills */}
        <aside className="pos-desk">
          <div className="pos-desk-card">
            <div className="pos-desk-head">
              <h3>POS Checkout Actions</h3>
              <p>Direct counter billing tools</p>
            </div>
            <div className="pos-desk-body">
              <button
                type="button"
                className="btn primary"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => {
                  setSelectedProductForSale(null);
                  setIsSaleOpen(true);
                }}
              >
                <Icon name="cart" /> + Open New Sale
              </button>

              <button
                type="button"
                className="btn soft"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => setIsCustomSaleOpen(true)}
              >
                <Icon name="zap" /> + Custom Sale
              </button>

              <button
                type="button"
                className="btn soft"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => setIsCustPurchaseOpen(true)}
              >
                <Icon name="package" /> + Buyback Purchase
              </button>

              <button
                type="button"
                className="btn"
                style={{ width: '100%' }}
                onClick={() => setIsExchangeOpen(true)}
              >
                <Icon name="refresh" /> + Product Exchange
              </button>
            </div>
          </div>

          {/* Held Bills */}
          <div className="pos-desk-card">
            <div className="pos-desk-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Held Bills ({heldBills.length})</h3>
                <p>Saved customer draft bills</p>
              </div>
            </div>
            <div className="pos-desk-body">
              {heldBills.length > 0 ? (
                <div className="held-list">
                  {heldBills.map(b => (
                    <div key={b.id} className="held-card">
                      <div className="held-card-top">
                        <div>
                          <h4>{b.label || b.partyName}</h4>
                          <p>{b.type} · {money(b.total)}</p>
                        </div>
                        <span className="held-card-total">{money(b.total)}</span>
                      </div>
                      <div className="held-card-actions">
                        <button
                          type="button"
                          className="btn small primary"
                          onClick={() => {
                            setSelectedProductForSale(null);
                            setIsSaleOpen(true);
                          }}
                        >
                          Resume
                        </button>
                        <button
                          type="button"
                          className="btn small danger"
                          onClick={() => handleDiscardHeld(b.id)}
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 18, color: 'var(--muted)', fontSize: 11 }}>
                  No held bills pending.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <SalesInvoiceModal
        isOpen={isSaleOpen}
        onClose={() => {
          setIsSaleOpen(false);
          setSelectedProductForSale(null);
        }}
        initialProduct={selectedProductForSale}
        onSuccess={(inv, shouldPreview = true) => {
          loadData();
          if (shouldPreview) {
            setPreviewInvoice(inv);
          }
        }}
      />

      <CustomSaleModal
        isOpen={isCustomSaleOpen}
        onClose={() => setIsCustomSaleOpen(false)}
        onSuccess={(inv, shouldPreview = true) => {
          loadData();
          if (shouldPreview) {
            setPreviewInvoice(inv);
          }
        }}
      />

      <CustomerPurchaseModal
        isOpen={isCustPurchaseOpen}
        onClose={() => setIsCustPurchaseOpen(false)}
        onSuccess={(inv) => {
          loadData();
          setPreviewInvoice(inv);
        }}
      />

      <ExchangeModal
        isOpen={isExchangeOpen}
        onClose={() => setIsExchangeOpen(false)}
        onSuccess={(inv) => {
          loadData();
          setPreviewInvoice(inv);
        }}
      />

      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
      />
    </>
  );
}
