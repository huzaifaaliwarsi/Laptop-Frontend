'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { formatProductTitle } from '../../utils/formatters';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function ProductSearchSelect({
  products = [],
  selectedProductId = '',
  onSelect,
  placeholder = 'Search by code, brand, model or barcode...',
  disabled = false,
  autoFocus = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedProduct = products.find(p => String(p.id) === String(selectedProductId));

  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(`${selectedProduct.code} — ${formatProductTitle(selectedProduct)}`.trim());
    } else {
      setSearchTerm('');
    }
  }, [selectedProductId, selectedProduct]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (selectedProduct) {
          setSearchTerm(`${selectedProduct.code} — ${selectedProduct.brand} ${selectedProduct.model || selectedProduct.productName || ''}`.trim());
        } else {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedProduct]);

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || (selectedProduct && searchTerm === `${selectedProduct.code} — ${selectedProduct.brand} ${selectedProduct.model || selectedProduct.productName || ''}`.trim())) {
      return products;
    }
    const q = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      const code = (p.code || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const model = (p.model || p.productName || '').toLowerCase();
      const specs = (p.specifications || '').toLowerCase();
      const condition = (p.condition || '').toLowerCase();
      const cat = (p.category || p.categoryName || '').toLowerCase();

      return code.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        specs.includes(q) ||
        condition.includes(q) ||
        cat.includes(q);
    });
  }, [products, searchTerm, selectedProduct]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.product-search-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectProduct = (product) => {
    onSelect(product);
    setSearchTerm(`${product.code} — ${formatProductTitle(product)}`.trim());
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setSearchTerm('');
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredProducts.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev - 1 + filteredProducts.length) % Math.max(1, filteredProducts.length));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredProducts[highlightedIndex]) {
        handleSelectProduct(filteredProducts[highlightedIndex]);
      } else if (!isOpen && filteredProducts.length > 0) {
        handleSelectProduct(filteredProducts[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute',
            left: 10,
            pointerEvents: 'none',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search size={13} />
        </span>

        <input
          ref={inputRef}
          type="text"
          className="input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{
            paddingLeft: 28,
            paddingRight: 48,
            width: '100%',
            height: 38
          }}
        />

        <div style={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center', gap: 2 }}>
          {(selectedProduct || searchTerm) && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear"
              style={{
                border: 'none',
                background: 'transparent',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <X size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen && inputRef.current) inputRef.current.focus();
              }
            }}
            tabIndex={-1}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: 9,
            border: '1px solid #cfdbea',
            boxShadow: '0 8px 24px rgba(15, 43, 85, 0.08)',
            maxHeight: 260,
            overflowY: 'auto',
            padding: 0
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              fontSize: 10.5,
              fontWeight: 500,
              color: '#64748b',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #edf2f7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{filteredProducts.length} in-stock product(s)</span>
            <span>Press Enter to select</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5 }}>
              No matching products in stock
            </div>
          ) : (
            filteredProducts.map((p, index) => {
              const isSelected = selectedProduct && selectedProduct.id === p.id;
              const isHighlighted = index === highlightedIndex;
              const expectedPrice = p.expectedSalePrice !== undefined && p.expectedSalePrice !== null ? p.expectedSalePrice : (p.costPrice || 0);

              // Clean meta text: condition and specifications if distinct
              const metaParts = [];
              if (p.condition) metaParts.push(p.condition);
              if (p.specifications && p.specifications !== p.model && p.specifications !== p.productName) {
                metaParts.push(p.specifications);
              }
              const metaText = metaParts.join(' • ');

              return (
                <div
                  key={p.id}
                  className="product-search-item"
                  onClick={() => handleSelectProduct(p)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    backgroundColor: isHighlighted ? '#f1f5f9' : isSelected ? '#f8fafc' : 'transparent',
                    borderBottom: '1px solid #f8fafc',
                    transition: 'background-color 0.1s'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>
                        {p.code}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <strong style={{ fontWeight: 600, color: '#17304f' }}>
                        {formatProductTitle(p)}
                      </strong>
                    </div>

                    {metaText && (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: '#64748b',
                          marginTop: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {metaText}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#17304f' }}>
                      {money(expectedPrice)}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                      {p.currentStock} in stock
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ color: '#2563eb', flexShrink: 0 }}>
                      <Check size={14} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
