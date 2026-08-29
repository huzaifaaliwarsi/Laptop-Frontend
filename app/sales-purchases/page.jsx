'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Eye, ArrowDownLeft, ArrowUpRight, Ban } from 'lucide-react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import InvoicePreviewModal from '../../components/modules/invoice/InvoicePreviewModal';
import VendorReturnModal from '../../components/modules/inventory/VendorReturnModal';
import SalesReturnModal from '../../components/modules/pos/SalesReturnModal';
import ProgressLoader from '../../components/common/ProgressLoader';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function SalesPurchasesPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [vendorReturnProduct, setVendorReturnProduct] = useState(null);
  const [salesReturnInvoice, setSalesReturnInvoice] = useState(null);

  const loadInvoices = () => {
    setLoading(true);
    let url = '/invoices?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (typeFilter) url += `type=${encodeURIComponent(typeFilter)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
    if (fromDate) url += `from=${encodeURIComponent(fromDate)}&`;
    if (toDate) url += `to=${encodeURIComponent(toDate)}&`;

    api.get(url)
      .then(res => {
        if (res.success) setInvoices(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
  }, [search, typeFilter, statusFilter, fromDate, toDate]);

  const handleOpenInvoice = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.success) setPreviewInvoice(res.data);
    } catch (err) {
      toast(err.message || 'Error fetching invoice details', 'error');
    }
  };

  const handleVoidSale = (invOrId) => {
    if (typeof invOrId === 'object' && invOrId !== null) {
      setSalesReturnInvoice(invOrId);
    } else if (previewInvoice) {
      setSalesReturnInvoice(previewInvoice);
    } else {
      const found = invoices.find(i => i.id === invOrId);
      if (found) setSalesReturnInvoice(found);
    }
  };

  const handleOpenVendorReturn = async (inv) => {
    try {
      let fullInv = inv;
      if (!fullInv.items || fullInv.items.length === 0) {
        const res = await api.get(`/invoices/${inv.id}`);
        if (res.success) fullInv = res.data;
      }

      const item = fullInv.items && fullInv.items[0];
      const prodObj = {
        id: item?.productId || fullInv.id,
        code: item?.productCode || item?.code || fullInv.invoiceNo,
        brand: item?.name || fullInv.partyName,
        model: item?.description || '',
        productName: item?.name || 'Purchased Item',
        costPrice: item?.rate || item?.unitPrice || fullInv.total,
        cost_price: item?.rate || item?.unitPrice || fullInv.total,
        currentStock: item?.quantity || 1,
        vendorId: fullInv.partyId,
        vendorName: fullInv.partyName,
        purchaseInvoiceNo: fullInv.invoiceNo
      };

      setVendorReturnProduct(prodObj);
    } catch (err) {
      toast('Could not prepare return data', 'error');
    }
  };

  // Calculate summaries: exclude voided/refunded from active totals
  const activeSalesTotal = invoices
    .filter(i => !i.isVoided && ['Sales Invoice', 'Service Invoice', 'Repair Invoice'].includes(i.type))
    .reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

  const activePurchasesTotal = invoices
    .filter(i => !i.isVoided && ['Vendor Purchase', 'Customer Purchase'].includes(i.type))
    .reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

  const totalRefundedAmount = invoices
    .filter(i => i.isVoided)
    .reduce((sum, i) => sum + (parseFloat(i.refundAmount || i.total) || 0), 0);

  const refundedCount = invoices.filter(i => i.isVoided).length;

  return (
    <>
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={13} style={{ color: '#059669' }} /> Total Active Sales
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: '#059669' }}>
            {money(activeSalesTotal)}
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowDownLeft size={13} style={{ color: 'var(--primary)' }} /> Total Active Purchases
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--primary)' }}>
            {money(activePurchasesTotal)}
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RotateCcw size={13} style={{ color: '#dc2626' }} /> Refunded / Returned Bills
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: '#dc2626' }}>
            {money(totalRefundedAmount)} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>({refundedCount} invoices)</span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%' }}>
            <input
              className="input search"
              style={{ maxWidth: 280 }}
              placeholder="Search invoice #, customer, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select"
              style={{ width: 170 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Invoice Types</option>
              <option value="Sales Invoice">Sales Invoices</option>
              <option value="Vendor Purchase">Vendor Purchases</option>
              <option value="Customer Purchase">Customer Purchases</option>
              <option value="Exchange Invoice">Exchange Invoices</option>
              <option value="Repair Invoice">Repair Invoices</option>
            </select>
            <select
              className="select"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Voided">Voided / Refunded</option>
            </select>
            <input
              className="input"
              type="date"
              style={{ width: 140 }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
            />
            <input
              className="input"
              type="date"
              style={{ width: 140 }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
            />
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Type</th>
                  <th>Party Name</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th>Status</th>
                  <th>Staff</th>
                  <th style={{ textAlign: 'center', width: 130 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <ProgressLoader tableRow colSpan={11} message="Please wait while invoices are loading..." />
                ) : invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      style={{ cursor: 'pointer', opacity: inv.isVoided ? 0.75 : 1 }}
                      onClick={() => handleOpenInvoice(inv.id)}
                    >
                      <td><strong>{inv.invoiceNo}</strong></td>
                      <td>{inv.type}</td>
                      <td>
                        <strong>{inv.partyName}</strong>
                        {inv.contact && <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{inv.contact}</div>}
                      </td>
                      <td>{fmtDate(inv.date)}</td>
                      <td>{inv.paymentMethod || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {inv.isVoided ? (
                          <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{money(inv.total)}</span>
                        ) : (
                          <strong>{money(inv.total)}</strong>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{money(inv.paid)}</td>
                      <td style={{ textAlign: 'right', color: inv.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {money(inv.balance)}
                      </td>
                      <td>
                        {inv.isVoided ? (
                          <span className="badge danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <RotateCcw size={11} /> Refunded
                          </span>
                        ) : (
                          <span className={`badge ${
                            inv.paymentStatus === 'Paid' ? 'success' : 'warning'
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td>{inv.createdByName || 'Admin'}</td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn small"
                            style={{ padding: '3px 7px' }}
                            onClick={() => handleOpenInvoice(inv.id)}
                            title="View Invoice"
                          >
                            <Eye size={13} />
                          </button>
                          {inv.type === 'Vendor Purchase' && !inv.isVoided && (
                            <button
                              type="button"
                              className="btn small soft"
                              style={{ padding: '3px 7px', color: '#dc2626' }}
                              onClick={() => handleOpenVendorReturn(inv)}
                              title="Return / Refund to Vendor"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                          {inv.type === 'Sales Invoice' && !inv.isVoided && isAdmin && (
                            <button
                              type="button"
                              className="btn small soft"
                              style={{ padding: '3px 7px', color: '#dc2626' }}
                              onClick={() => handleVoidSale(inv.id)}
                              title="Void / Sales Return"
                            >
                              <Ban size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No invoice records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        onVoidSale={isAdmin ? handleVoidSale : null}
        onVendorReturn={handleOpenVendorReturn}
      />

      {/* Vendor Return Modal integration in Sales & Purchases */}
      {vendorReturnProduct && (
        <VendorReturnModal
          isOpen={!!vendorReturnProduct}
          onClose={() => setVendorReturnProduct(null)}
          product={vendorReturnProduct}
          onSuccess={() => {
            setVendorReturnProduct(null);
            setPreviewInvoice(null);
            loadInvoices();
          }}
        />
      )}

      {/* Customer Sales Return Modal */}
      {salesReturnInvoice && (
        <SalesReturnModal
          isOpen={!!salesReturnInvoice}
          onClose={() => setSalesReturnInvoice(null)}
          invoice={salesReturnInvoice}
          onSuccess={() => {
            setSalesReturnInvoice(null);
            setPreviewInvoice(null);
            loadInvoices();
          }}
        />
      )}
    </>
  );
}
