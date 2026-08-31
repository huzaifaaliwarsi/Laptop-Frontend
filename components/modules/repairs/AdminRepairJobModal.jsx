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
  const [additionalWorkRequests, setAdditionalWorkRequests] = useState([]);
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
      api.get('/staff?role=technician'),
      api.get(`/repairs/${jobId}/additional-work`)
    ]).then(([jRes, tRes, aRes]) => {
      if (jRes.success && jRes.data) {
        setJob(jRes.data);
        setEditStatus(jRes.data.status);
        setEditTechId(jRes.data.technicianId || '');
        setEditPriority(jRes.data.priority || 'Normal');
        setAdminNote('');
      }
      if (tRes.success) setTechnicians(tRes.data || []);
      if (aRes.success) setAdditionalWorkRequests(aRes.data || []);
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
  const canApprove = isDiagnosis && job.status === 'Waiting for Customer Approval' && job.approvalStatus !== 'Approved' && parseFloat(job.quotationAmount || 0) > 0;
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

  const handleApproveAdditionalWork = async (requestId, amount) => {
    if (!confirm(`Approve additional work request (+ PKR ${amount}) on behalf of customer?`)) return;
    try {
      const res = await api.post(`/repairs/${job.id}/additional-work/${requestId}/approve`, {
        customerResponse: 'Approved manually by Admin/Sales via phone confirmation'
      });
      if (res.success) {
        toast('Additional work request approved and added to job!');
        loadJob();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error approving additional work', 'error');
    }
  };

  const handleDeclineAdditionalWork = async (requestId) => {
    if (!confirm('Decline additional work request? No additional charges will be added.')) return;
    try {
      const res = await api.post(`/repairs/${job.id}/additional-work/${requestId}/decline`, {
        customerResponse: 'Declined manually by Admin/Sales via phone confirmation'
      });
      if (res.success) {
        toast('Additional work request declined.');
        loadJob();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error declining additional work', 'error');
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Job Type</span>
          <span className={`badge ${isDiagnosis ? 'purple' : 'info'}`} style={{ fontWeight: 700, fontSize: 12 }}>
            {job.jobType}
          </span>
        </div>

        <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Current Status</span>
          <span className={`badge ${job.status === 'Work in Progress' || job.status === 'Repair Approved' ? 'success' : job.status === 'Ready for Delivery' ? 'success' : job.status.includes('Waiting') ? 'warning' : 'info'}`} style={{ fontWeight: 700, fontSize: 12 }}>
            {job.status}
          </span>
        </div>

        <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Technician</span>
          <strong style={{ fontSize: 13, color: '#1e40af' }}>{job.technicianName || 'Unassigned'}</strong>
        </div>

        <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Total Bill</span>
          <strong style={{ fontSize: 14, color: '#1e293b' }}>{money(job.total)}</strong>
        </div>

        <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Remaining Due</span>
          <strong style={{ fontSize: 14, color: job.remaining > 0 ? '#dc2626' : '#16a34a' }}>{money(job.remaining)}</strong>
        </div>
      </div>

      {canApprove && (
        <div style={{
          padding: '14px 16px',
          background: '#fffbeb',
          borderRadius: 10,
          border: '1px solid #fde047',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge warning" style={{ fontWeight: 700, fontSize: 11 }}>⏳ APPROVAL REQUIRED</span>
              <strong style={{ fontSize: 13, color: '#854d0e' }}>Customer Quotation Approval</strong>
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <div><strong>Diagnosis:</strong> {job.diagnosedIssue || 'Inspection findings recorded'}</div>
              <div><strong>Recommended Repair:</strong> {job.recommendedSolution || 'Hardware repair'}</div>
              <div><strong>Quoted Estimate:</strong> <b style={{ color: '#1e293b' }}>{money(job.quotationAmount)}</b></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn success small" onClick={handleApproveQuote} style={{ fontWeight: 700 }}>
              Approve ({money(job.quotationAmount)})
            </button>
            <button type="button" className="btn danger small" onClick={handleDeclineQuote}>
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Additional Fault Approval Requests */}
      {additionalWorkRequests && additionalWorkRequests.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {additionalWorkRequests.map(req => {
            const isPending = req.status === 'Pending Approval';
            const isApproved = req.status === 'Approved';
            const isDeclined = req.status === 'Declined';
            return (
              <div
                key={req.id}
                className="line-card"
                style={{
                  borderColor: isPending ? '#fde047' : isApproved ? '#bbf7d0' : '#fecaca',
                  background: isPending ? '#fffbeb' : isApproved ? '#f0fdf4' : '#fef2f2',
                  padding: '12px 14px'
                }}
              >
                <div className="line-card-head" style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${isPending ? 'warning' : isApproved ? 'success' : 'danger'}`} style={{ fontSize: 10.5, fontWeight: 700 }}>
                      {isPending ? '⏳ ADDITIONAL FAULT APPROVAL REQUIRED' : isApproved ? `✅ APPROVED (${req.approval_source || 'WhatsApp'})` : '❌ DECLINED'}
                    </span>
                    <strong style={{ fontSize: 13, color: '#1e293b' }}>{req.recommended_service}</strong>
                  </div>
                  {isPending ? (
                    <div>
                      <button
                        type="button"
                        className="btn success small"
                        onClick={() => handleApproveAdditionalWork(req.id, req.total_quotation)}
                        style={{ marginRight: 8, fontWeight: 700 }}
                      >
                        Approve (+ PKR {parseFloat(req.total_quotation || 0)})
                      </button>
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => handleDeclineAdditionalWork(req.id)}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                      {isApproved ? `+ ${money(req.total_quotation)} Added to Bill` : 'No Extra Charges'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: '#475569' }}>
                  <strong>Discovered Fault:</strong> {req.fault_finding}<br />
                  <strong>Service Charge:</strong> PKR {parseFloat(req.service_charge || 0).toLocaleString('en-PK')} | <strong>Parts Charge:</strong> PKR {parseFloat(req.parts_charge || 0).toLocaleString('en-PK')} | <strong>Total Quote:</strong> <b style={{ color: '#1e40af' }}>{money(req.total_quotation)}</b>
                  {req.customer_safe_note && <div><strong>Customer Note:</strong> {req.customer_safe_note}</div>}
                  {req.customer_response && <div style={{ color: '#64748b', marginTop: 2 }}><strong>Audit Response:</strong> {req.customer_response}</div>}
                </div>
              </div>
            );
          })}
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
