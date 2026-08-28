'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import CreateRepairJobModal from '../../components/modules/repairs/CreateRepairJobModal';
import AdminRepairJobModal from '../../components/modules/repairs/AdminRepairJobModal';
import RepairPaymentModal from '../../components/modules/repairs/RepairPaymentModal';
import RepairServiceModal from '../../components/modules/repairs/RepairServiceModal';
import InvoicePreviewModal from '../../components/modules/invoice/InvoicePreviewModal';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicians, setTechnicians] = useState([]);
  const [techFilter, setTechFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [paymentJob, setPaymentJob] = useState(null);
  const [isDeliveryPayment, setIsDeliveryPayment] = useState(false);
  const [isServicesCatalogOpen, setIsServicesCatalogOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadRepairs = () => {
    setLoading(true);
    let url = '/repairs?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (techFilter) url += `technicianId=${encodeURIComponent(techFilter)}&`;

    Promise.all([
      api.get(url),
      api.get('/staff?role=technician')
    ]).then(([rRes, tRes]) => {
      if (rRes.success) setRepairs(rRes.data || []);
      if (tRes.success) setTechnicians(tRes.data || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRepairs();
  }, [search, techFilter]);

  const filteredRepairs = repairs.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'waiting') return r.status === 'Waiting for Customer Approval' || r.approvalStatus === 'Pending';
    if (statusFilter === 'active') return ['Job Received', 'Diagnosis Received', 'Diagnosis in Progress', 'Repair Approved', 'Work in Progress', 'Waiting for Parts'].includes(r.status);
    if (statusFilter === 'ready') return ['Work Completed', 'Ready for Delivery'].includes(r.status);
    if (statusFilter === 'delivered') return r.status === 'Delivered & Closed';
    return true;
  });

  const handleOpenPayment = (job, isDeliver = false) => {
    setPaymentJob(job);
    setIsDeliveryPayment(isDeliver);
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      if (res.success) setPreviewInvoice(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <input
                className="input search"
                style={{ maxWidth: 320 }}
                placeholder="Search tracking ID, customer, brand, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                style={{ width: 170 }}
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
              >
                <option value="">All Technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIsServicesCatalogOpen(true)}
              >
                <Icon name="settings" /> Master Services Catalog
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => setIsCreateOpen(true)}
              >
                <Icon name="plus" /> + Intake Repair Job
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--line)', background: '#fcfdfe' }}>
          <div className="tabs">
            <button
              type="button"
              className={`tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Jobs ({repairs.length})
            </button>
            <button
              type="button"
              className={`tab ${statusFilter === 'waiting' ? 'active' : ''}`}
              onClick={() => setStatusFilter('waiting')}
            >
              Waiting Approval ({repairs.filter(r => r.status === 'Waiting for Customer Approval' || r.approvalStatus === 'Pending').length})
            </button>
            <button
              type="button"
              className={`tab ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active Workshop ({repairs.filter(r => ['Job Received', 'Diagnosis Received', 'Diagnosis in Progress', 'Repair Approved', 'Work in Progress', 'Waiting for Parts'].includes(r.status)).length})
            </button>
            <button
              type="button"
              className={`tab ${statusFilter === 'ready' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ready')}
            >
              Ready for Delivery ({repairs.filter(r => ['Work Completed', 'Ready for Delivery'].includes(r.status)).length})
            </button>
            <button
              type="button"
              className={`tab ${statusFilter === 'delivered' ? 'active' : ''}`}
              onClick={() => setStatusFilter('delivered')}
            >
              Delivered & Closed ({repairs.filter(r => r.status === 'Delivered & Closed').length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Customer</th>
                  <th>Device / Problem</th>
                  <th>Type</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Expected</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      Loading repair jobs from database...
                    </td>
                  </tr>
                ) : filteredRepairs.length > 0 ? (
                  filteredRepairs.map((job) => (
                    <tr
                      key={job.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <td><strong>{job.trackingId}</strong></td>
                      <td>
                        <strong>{job.customerName}</strong>
                        <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{job.contact}</div>
                      </td>
                      <td>
                        <div>{[job.brand, job.model].filter(Boolean).join(' ') || job.productType}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{job.problem}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 10, fontWeight: 700 }}>{job.jobType}</span>
                      </td>
                      <td>{job.technicianName || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${
                          job.status === 'Delivered & Closed' ? 'success' :
                          job.status === 'Ready for Delivery' ? 'success' :
                          job.status === 'Waiting for Customer Approval' ? 'warning' :
                          job.status === 'Cancelled' ? 'danger' : 'warning'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td>{fmtDate(job.expectedCompletion)}</td>
                      <td style={{ textAlign: 'right' }}><strong>{money(job.total)}</strong></td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: job.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {money(job.remaining)}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            Card
                          </button>
                          {job.status !== 'Delivered & Closed' && (
                            <button
                              type="button"
                              className="btn small primary"
                              onClick={() => handleOpenPayment(job, true)}
                            >
                              Deliver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No repair jobs matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateRepairJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadRepairs()}
      />

      <AdminRepairJobModal
        isOpen={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
        jobId={selectedJobId}
        onOpenPayment={(j, isDeliver) => {
          setSelectedJobId(null);
          handleOpenPayment(j, isDeliver);
        }}
        onViewInvoice={(invId) => {
          setSelectedJobId(null);
          handleViewInvoice(invId);
        }}
        onSuccess={() => loadRepairs()}
      />

      <RepairPaymentModal
        isOpen={!!paymentJob}
        onClose={() => setPaymentJob(null)}
        job={paymentJob}
        isDeliveryHandover={isDeliveryPayment}
        onSuccess={() => loadRepairs()}
      />

      <RepairServiceModal
        isOpen={isServicesCatalogOpen}
        onClose={() => setIsServicesCatalogOpen(false)}
        onSuccess={() => loadRepairs()}
      />

      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
      />
    </>
  );
}
