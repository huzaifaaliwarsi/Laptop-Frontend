'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { DetailModalSkeleton } from '../../common/Skeleton';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function AdminRepairJobModal({
  isOpen,
  onClose,
  jobId,
  onOpenPayment,
  onViewInvoice,
  onSuccess
}) {
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [editStatus, setEditStatus] = useState('');
  const [editTechId, setEditTechId] = useState('');
  const [editPriority, setEditPriority] = useState('Normal');
  const [adminNote, setAdminNote] = useState('');

  const loadJob = () => {
    if (!jobId) return;
    setLoading(true);
    Promise.all([
      api.get(`/repairs/${jobId}`),
      api.get('/staff?role=technician')
    ]).then(([jRes, tRes]) => {
      if (jRes.success && jRes.data) {
        setJob(jRes.data);
        setEditStatus(jRes.data.status);
        setEditTechId(jRes.data.technicianId || '');
        setEditPriority(jRes.data.priority || 'Normal');
        setAdminNote('');
      }
      if (tRes.success) setTechnicians(tRes.data || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && jobId) {
      loadJob();
    }
  }, [isOpen, jobId]);

  if (!job && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading Repair Card..." wide={true}>
        <DetailModalSkeleton />
      </Modal>
    );
  }

  if (!job) return null;

  const isDiagnosis = job.jobType === 'Diagnosis Job' || job.originJobType === 'Diagnosis Job';
  const canApprove = job.status === 'Waiting for Customer Approval' || job.approvalStatus === 'Pending';
  const isDelivered = job.status === 'Delivered & Closed';

  const handleApproveQuote = async () => {
    if (!confirm(`Approve quotation for PKR ${parseFloat(job.quotationAmount || 0)}? This will start the repair work.`)) return;
    try {
      const res = await api.post(`/repairs/${job.id}/approve`);
      if (res.success) {
        toast('Quotation approved! Technician may now proceed with repair.');
        loadJob();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error approving quotation', 'error');
    }
  };

  const handleDeclineQuote = async () => {
    if (!confirm('Decline quotation? The repair will be closed with only diagnosis fee.')) return;
    try {
      const res = await api.post(`/repairs/${job.id}/decline`);
      if (res.success) {
        toast('Quotation declined.');
        loadJob();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error declining quotation', 'error');
    }
  };

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/repairs/${job.id}/admin-update`, {
        status: editStatus,
        technicianId: editTechId || null,
        priority: editPriority,
        updateNote: adminNote.trim() || 'Admin updated job details'
      });
      if (res.success) {
        toast('Job details updated successfully!');
        loadJob();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error updating job', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliver = async () => {
    if (job.remaining > 0.005) {
      if (onOpenPayment) {
        onOpenPayment(job, true);
      }
      return;
    }

    if (!confirm('Confirm delivery & closure of this repair job?')) return;
    try {
      const res = await api.post(`/repairs/${job.id}/deliver`);
      if (res.success) {
        toast('Device handed over & repair job closed successfully!');
        loadJob();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error completing delivery', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Repair Job Card"
      subtitle={`${job.trackingId} — ${job.customerName} (${job.contact || ''})`}
      wide={true}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          {onViewInvoice && (
            <button
              type="button"
              className="btn"
              onClick={() => onViewInvoice(job.invoiceId || job.trackingId)}
            >
              Print Invoice / Bill
            </button>
          )}
          {!isDelivered && job.remaining > 0 && onOpenPayment && (
            <button
              type="button"
              className="btn success"
              onClick={() => onOpenPayment(job, false)}
            >
              Collect Payment
            </button>
          )}
          {!isDelivered && (
            <button
              type="button"
              className="btn primary"
              onClick={handleDeliver}
            >
              {job.remaining > 0 ? `Pay & Deliver (${money(job.remaining)})` : 'Deliver & Close Job'}
            </button>
          )}
        </>
      }
    >
      <div className="repair-finance-band" style={{ marginBottom: 14 }}>
        <div className="repair-finance-card">
          <span>Current Status</span>
          <strong>{job.status}</strong>
        </div>
        <div className="repair-finance-card">
          <span>Assigned Technician</span>
          <strong>{job.technicianName || 'Unassigned'}</strong>
        </div>
        <div className="repair-finance-card">
          <span>Total Bill</span>
          <strong>{money(job.total)}</strong>
        </div>
        <div className="repair-finance-card">
          <span>Remaining Due</span>
          <strong style={{ color: job.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{money(job.remaining)}</strong>
        </div>
      </div>

      {canApprove && (
        <div className="line-card" style={{ borderColor: '#fde047', background: '#fffbeb', marginBottom: 14 }}>
          <div className="line-card-head">
            <strong style={{ color: '#854d0e' }}>Customer Approval Required for Quotation</strong>
            <div>
              <button type="button" className="btn success small" onClick={handleApproveQuote} style={{ marginRight: 8 }}>
                Approve (PKR {parseFloat(job.quotationAmount || 0)})
              </button>
              <button type="button" className="btn danger small" onClick={handleDeclineQuote}>
                Decline Quotation
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11 }}>
            Diagnosed Issue: <b>{job.diagnosedIssue || 'Inspection completed'}</b><br />
            Recommended Solution: <b>{job.recommendedSolution || 'Component repair'}</b><br />
            Quoted Estimate: <b>{money(job.quotationAmount)}</b>
          </p>
        </div>
      )}

      <div className="grid cols-2" style={{ gap: 14 }}>
        {/* Device & Service lines */}
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h3>Device & Service Breakdown</h3>
          </div>
          <div className="panel-body">
            <div style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>
              <strong>Category:</strong> <span className="badge" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--blue-50, #eff6ff)', color: 'var(--primary, #2563eb)' }}>{job.categoryName || job.productType || 'Standard'}</span><br />
              <strong>Device:</strong> {[job.brand, job.model].filter(Boolean).join(' ') || job.categoryName || 'Device'}<br />
              <strong>Problem:</strong> {job.problem}<br />
              <strong>Expected Date:</strong> {fmtDate(job.expectedCompletion)}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item / Service</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'center', width: 50 }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {job.lines && job.lines.map((l, idx) => {
                    const unitP = parseFloat(l.charges || 0);
                    const qty = parseInt(l.quantity || 1, 10);
                    const lTotal = l.lineTotal !== undefined ? parseFloat(l.lineTotal) : unitP * qty;
                    return (
                      <tr key={idx}>
                        <td>
                          <strong>{l.name}</strong>
                          {l.condition && <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{l.condition}</div>}
                        </td>
                        <td style={{ textAlign: 'right' }}>{money(unitP)}</td>
                        <td style={{ textAlign: 'center' }}>{qty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(lTotal)}</td>
                      </tr>
                    );
                  })}
                  {job.usedParts && job.usedParts.map((p, idx) => {
                    const unitP = parseFloat(p.customerCharge || 0);
                    const qty = parseInt(p.quantity || 1, 10);
                    return (
                      <tr key={idx}>
                        <td>
                          <strong>[Part] {p.name}</strong>
                          <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>Code: {p.productCode}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{money(unitP)}</td>
                        <td style={{ textAlign: 'center' }}>{qty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(unitP * qty)}</td>
                      </tr>
                    );
                  })}
                  {job.extraCharges > 0 && (
                    <tr>
                      <td><strong>Extra Charge</strong> ({job.extraReason || ''})</td>
                      <td style={{ textAlign: 'right' }}>{money(job.extraCharges)}</td>
                      <td style={{ textAlign: 'center' }}>1</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(job.extraCharges)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Administration / Status Edit Form */}
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h3>Reception & Staff Assignment</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleAdminUpdate}>
              <div className="form-grid">
                <div className="field span-6">
                  <label>Status</label>
                  <select
                    className="select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Job Received">Job Received</option>
                    <option value="Diagnosis in Progress">Diagnosis in Progress</option>
                    <option value="Waiting for Customer Approval">Waiting for Customer Approval</option>
                    <option value="Repair Approved">Repair Approved</option>
                    <option value="Work in Progress">Work in Progress</option>
                    <option value="Waiting for Parts">Waiting for Parts</option>
                    <option value="Ready for Delivery">Ready for Delivery</option>
                    <option value="Delivered & Closed">Delivered & Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="field span-6">
                  <label>Assigned Technician</label>
                  <select
                    className="select"
                    value={editTechId}
                    onChange={(e) => setEditTechId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field span-6">
                  <label>Priority</label>
                  <select
                    className="select"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="field span-6">
                  <label>Progress</label>
                  <div style={{ paddingTop: 8, fontWeight: 800 }}>{job.workProgress || 0}%</div>
                </div>

                <div className="field span-12">
                  <label>Reception Note</label>
                  <input
                    className="input"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Note for status change..."
                  />
                </div>

                <div className="span-12" style={{ textAlign: 'right' }}>
                  <button type="submit" className="btn soft" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Assignment & Status'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* History log */}
      <div className="panel">
        <div className="panel-head">
          <h3>Job History & Payment Logs</h3>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Action / Note</th>
                  <th>By Staff</th>
                </tr>
              </thead>
              <tbody>
                {job.history && job.history.length > 0 ? (
                  job.history.map((h) => (
                    <tr key={h.id}>
                      <td>{fmtDate(h.at)}</td>
                      <td><span className="badge">{h.status}</span></td>
                      <td>{h.note}</td>
                      <td><strong>{h.by}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 18 }}>
                      No status logs recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
