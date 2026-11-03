'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Search, X, Check, AlertCircle, Phone, ArrowRight, UserCheck, ChevronDown, MapPin, Users } from 'lucide-react';
import api from '../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

// Clean phone string for robust comparison
function cleanPhone(str) {
  if (!str) return '';
  let p = String(str).replace(/[\s\-\(\)\.]+/g, '');
  if (p.startsWith('+92')) p = '0' + p.slice(3);
  else if (p.startsWith('0092')) p = '0' + p.slice(4);
  else if (p.startsWith('92') && p.length === 12 && p.startsWith('923')) p = '0' + p.slice(2);
  return p;
}

export default function CustomerSearchInput({
  customerName = '',
  setCustomerName,
  contact = '',
  setContact,
  customerId = null,
  setCustomerId,
  required = true,
  className = ''
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoMatchedCustomer, setAutoMatchedCustomer] = useState(null);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch branch customers list once on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.get('/customers')
      .then((res) => {
        if (isMounted && res.success) {
          setCustomers(res.data || []);
        }
      })
      .catch((err) => console.error('Error loading customers:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-detect existing customer when typing contact phone number
  useEffect(() => {
    const cleaned = cleanPhone(contact);
    if (!cleaned || cleaned.length < 8) {
      setAutoMatchedCustomer(null);
      return;
    }

    const matched = customers.find((c) => {
      const cPhone = cleanPhone(c.contact);
      return cPhone && cPhone === cleaned;
    });

    if (matched) {
      setAutoMatchedCustomer(matched);
      // Auto-link customer ID if not already manually set
      if (!customerId) {
        if (setCustomerId) setCustomerId(matched.id);
        // If current customerName is blank or generic, auto-fill it
        if (!customerName || customerName.trim() === '' || customerName.toLowerCase() === 'walk-in' || customerName.toLowerCase() === 'walk-in customer') {
          if (setCustomerName) setCustomerName(matched.name);
        }
      }
    } else {
      setAutoMatchedCustomer(null);
    }
  }, [contact, customers, customerId, customerName, setCustomerId, setCustomerName]);

  // Find currently selected customer object if customerId is set
  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    return customers.find((c) => c.id === customerId) || null;
  }, [customerId, customers]);

  // Filter customers for dropdown search
  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const cleanQ = cleanPhone(q);
    if (!q) return customers.slice(0, 30); // show top 30 initially

    return customers.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = cleanPhone(c.contact);
      const rawPhone = (c.contact || '').toLowerCase();
      const id = (c.id || '').toLowerCase();

      return (
        name.includes(q) ||
        (cleanQ && phone.includes(cleanQ)) ||
        rawPhone.includes(q) ||
        id.includes(q)
      );
    }).slice(0, 30);
  }, [customers, searchTerm]);

  // Handle selecting a customer from dropdown
  const handleSelectCustomer = (cust) => {
    if (!cust) return;
    if (setCustomerName) setCustomerName(cust.name);
    if (setContact) setContact(cust.contact || '');
    if (setCustomerId) setCustomerId(cust.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Handle unlinking / clearing customer
  const handleUnlink = () => {
    if (setCustomerId) setCustomerId(null);
    setAutoMatchedCustomer(null);
  };

  return (
    <div ref={containerRef} className={`customer-search-container ${className}`} style={{ position: 'relative' }}>
      {/* Label with "Select Previous Customer" button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>
          Customer Name {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        
        <button
          type="button"
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: isDropdownOpen ? '#1d4ed8' : '#334155',
            background: isDropdownOpen ? '#eff6ff' : '#f8fafc',
            border: '1px solid ' + (isDropdownOpen ? '#93c5fd' : '#cbd5e1'),
            borderRadius: 6,
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.15s ease'
          }}
          title="Search previous customers by name or phone"
        >
          <Users size={12} className={isDropdownOpen ? 'text-blue-600' : 'text-slate-500'} />
          <span>{selectedCustomer ? 'Change Customer' : 'Previous Customers'}</span>
          <ChevronDown size={11} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>

      {/* Main Customer Name Input */}
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value);
            // If user explicitly changes name away from selected customer, keep or unbind
          }}
          placeholder="Type customer name or select previous..."
          required={required}
          style={{
            paddingRight: selectedCustomer ? 32 : 12,
            borderColor: selectedCustomer ? '#10b981' : undefined,
            backgroundColor: selectedCustomer ? '#f0fdf4' : undefined
          }}
        />

        {selectedCustomer && (
          <button
            type="button"
            onClick={handleUnlink}
            title="Unlink previous customer (enter as new/walk-in)"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              borderRadius: 4
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Active Linked Customer Indicator Pill */}
      {selectedCustomer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 6,
            padding: '4px 8px',
            marginTop: 4,
            fontSize: 11,
            color: '#065f46'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={13} color="#059669" />
            <span>
              <strong>Linked:</strong> {selectedCustomer.name} (<strong>{selectedCustomer.id}</strong>)
            </span>
          </div>
          <div>
            {parseFloat(selectedCustomer.openReceivable || 0) > 0 ? (
              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                Due: {money(selectedCustomer.openReceivable)}
              </span>
            ) : parseFloat(selectedCustomer.openPayable || 0) > 0 ? (
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                Advance: {money(selectedCustomer.openPayable)}
              </span>
            ) : (
              <span style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Check size={12} strokeWidth={2.5} /> Clear
              </span>
            )}
          </div>
        </div>
      )}

      {/* Auto-Match Phone Notification when not explicitly selected */}
      {!selectedCustomer && autoMatchedCustomer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 6,
            padding: '4px 8px',
            marginTop: 4,
            fontSize: 11,
            color: '#1e40af'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={12} color="#2563eb" />
            <span>
              Phone matched: <strong>{autoMatchedCustomer.name}</strong> ({autoMatchedCustomer.id})
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectCustomer(autoMatchedCustomer)}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Apply & Link
          </button>
        </div>
      )}

      {/* Searchable Previous Customers Dropdown Menu */}
      {isDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            marginTop: 4,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            maxHeight: 340,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Search Box Header */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Search size={14} color="#64748b" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search previous customer by name, phone, CUS-ID..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 12,
                background: 'transparent',
                color: '#1e293b'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Customer Items List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 280 }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                {loading ? 'Loading customers...' : 'No previous customers found matching search.'}
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = customerId === c.id;
                const hasDue = parseFloat(c.openReceivable || 0) > 0;
                const hasAdvance = parseFloat(c.openPayable || 0) > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>{c.name}</strong>
                        <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4 }}>
                          {c.id}
                        </span>
                        {isSelected && <Check size={13} color="#10b981" />}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                        {c.contact ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} className="text-slate-400" />
                            <span>{c.contact}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No phone recorded</span>
                        )}
                        {c.address && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} className="text-slate-400" />
                            <span>{c.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {hasDue ? (
                        <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          Due: {money(c.openReceivable)}
                        </span>
                      ) : hasAdvance ? (
                        <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          Advance: {money(c.openPayable)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                          Clear
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              Showing {filteredCustomers.length} of {customers.length} previous customer(s)
            </span>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(false)}
              style={{ fontSize: 11, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

