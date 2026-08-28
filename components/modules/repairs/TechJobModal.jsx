'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import RepairServiceModal from './RepairServiceModal';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function TechJobModal({
  isOpen,
  onClose,
  jobId,
  onSuccess
}) {
  const { toast } = useToast();
  const { role } = useAuth();
  const isTech = role === 'technician';
  const canViewFinancials = role === 'admin' || role === 'sales';

  const [job, setJob] = useState(null);
  const [inStockProducts, setInStockProducts] = useState([]);
  const [masterServices, setMasterServices] = useState([]);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [status, setStatus] = useState('');
  const [workProgress, setWorkProgress] = useState(0);
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [diagnosedIssue, setDiagnosedIssue] = useState('');
  const [recommendedSolution, setRecommendedSolution] = useState('');
  const [quotationAmount, setQuotationAmount] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [testingResult, setTestingResult] = useState('Not Tested');
  const [warrantyDays, setWarrantyDays] = useState(0);
  const [finalRemarks, setFinalRemarks] = useState('');
  const [updateNote, setUpdateNote] = useState('');

  // Part consumption
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partCustomerCharge, setPartCustomerCharge] = useState('');

  const loadJob = () => {
    if (!jobId) return;
    setLoading(true);
    Promise.all([
      api.get(`/repairs/${jobId}`),
      api.get('/products?inStockOnly=true'),
      api.get('/repair-services?status=Active')
    ]).then(([jRes, pRes, sRes]) => {
      if (jRes.success && jRes.data) {
        const j = jRes.data;
        setJob(j);
        setStatus(j.status);
        setWorkProgress(j.workProgress || 0);
        setExpectedCompletion(j.expectedCompletion ? j.expectedCompletion.split('T')[0] : '');
        setDiagnosedIssue(j.diagnosedIssue || '');
        setRecommendedSolution(j.recommendedSolution || '');
        setQuotationAmount(j.quotationAmount || '');
        setTechnicalNotes(j.technicalNotes || '');
        setTestingResult(j.testingResult || 'Passed');
        setWarrantyDays(j.warrantyDays || 0);
        setFinalRemarks(j.finalRemarks || '');
        setUpdateNote('');
        setSelectedPartId('');
        setPartQty(1);
        setPartCustomerCharge('');
      }
      if (pRes.success) setInStockProducts(pRes.data || []);
      if (sRes.success) setMasterServices(sRes.data || []);
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
      <Modal isOpen={isOpen} onClose={onClose} title="Loading Repair Job...">
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Loading technician job card...</div>
      </Modal>
    );
  }

  if (!job) return null;

  const isDiagnosis = job.jobType === 'Diagnosis Job' || job.originJobType === 'Diagnosis Job';
  const isApproved = !isDiagnosis || job.approvalStatus === 'Approved' || ['Repair Approved', 'Work in Progress', 'Waiting for Parts', 'Work Completed', 'Ready for Delivery', 'Delivered & Closed'].includes(job.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!updateNote.trim()) {
      toast('Please enter a brief note for this update', 'error');
      return;
    }

    if (status === 'Waiting for Customer Approval') {
      if (!diagnosedIssue.trim() || !recommendedSolution.trim()) {
        toast('Diagnosed issue and recommended solution are required before requesting customer approval', 'error');
        return;
      }
      if (canViewFinancials && quotationAmount !== '' && parseFloat(quotationAmount || 0) <= 0) {
        toast('Valid estimated quotation amount is required', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        status,
        workProgress: parseInt(workProgress || 0, 10),
        expectedCompletion: expectedCompletion || null,
        diagnosedIssue: diagnosedIssue.trim(),
        recommendedSolution: recommendedSolution.trim(),
        quotationAmount: canViewFinancials && quotationAmount !== '' ? parseFloat(quotationAmount) : null,
        technicalNotes: technicalNotes.trim(),
        testingResult,
        warrantyDays: parseInt(warrantyDays || 0, 10),
        finalRemarks: finalRemarks.trim(),
        updateNote: updateNote.trim(),
        partId: selectedPartId || null,
        partQty: parseInt(partQty || 1, 10),
        partCharge: canViewFinancials ? parseFloat(partCustomerCharge || 0) : 0
      };

      const res = await api.put(`/repairs/${job.id}/technical-update`, payload);
      if (res.success) {
        toast('Technical update saved & synced to customer WhatsApp!');
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error saving update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Technician Workbench"
      subtitle={`${job.trackingId} — ${job.customerName} (${job.brand || ''} ${job.model || ''})`}
      wide={true}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button
            type="submit"
            form="techJobUpdateForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Technical Update'}
          </button>
        </>
      }
    >
      {/* Top Status & Priority Band */}
      <div className="repair-finance-band" style={{ marginBottom: 14 }}>
        <div className="repair-finance-card">
          <span>Current Status</span>
          <strong>{job.status}</strong>
        </div>
        <div className="repair-finance-card">
          <span>Priority</span>
          <strong style={{ color: job.priority === 'Urgent' ? 'var(--danger)' : 'var(--text)' }}>{job.priority}</strong>
        </div>
        <div className="repair-finance-card">
          <span>Job Type</span>
          <strong>{job.jobType}</strong>
        </div>
        {canViewFinancials ? (
          <>
            <div className="repair-finance-card">
              <span>Total Bill</span>
              <strong>{money(job.total)}</strong>
            </div>
            <div className="repair-finance-card">
              <span>Outstanding Balance</span>
              <strong style={{ color: job.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{money(job.remaining)}</strong>
            </div>
          </>
        ) : (
          <div className="repair-finance-card">
            <span>Expected Completion</span>
            <strong>{expectedCompletion || 'In Progress'}</strong>
          </div>
        )}
      </div>

      <div className="callout" style={{ marginBottom: 14 }}>
        <strong>Customer Complaint / Reported Defect:</strong>
        <p style={{ margin: '4px 0 0', color: 'var(--text)' }}>{job.problem}</p>
      </div>

      <form id="techJobUpdateForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-4">
            <label>Update Repair Status *</label>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              {isDiagnosis && !isApproved && (
                <optgroup label="Diagnosis Phase">
                  <option value="Diagnosis Received">Diagnosis Received</option>
                  <option value="Diagnosis in Progress">Diagnosis in Progress</option>
                  <option value="Diagnosis Completed">Diagnosis Completed</option>
                  <option value="Waiting for Customer Approval">Waiting for Customer Approval</option>
                </optgroup>
              )}
              {isApproved && (
                <optgroup label="Active Repair Bench">
                  {!isDiagnosis && <option value="Job Received">Job Received (In Queue)</option>}
                  <option value="Repair Approved">Repair Approved</option>
                  <option value="Work in Progress">Work in Progress</option>
                  <option value="Waiting for Parts">Waiting for Parts</option>
                  <option value="Testing & Quality Check">Testing & Quality Check</option>
                  <option value="Work Completed">Work Completed (Done)</option>
                  <option value="Ready for Delivery">Ready for Delivery (Completed)</option>
                </optgroup>
              )}
              <optgroup label="Close / Return">
                <option value="Cancelled">Cancelled</option>
                <option value="Returned Without Repair">Returned Without Repair</option>
              </optgroup>
            </select>
          </div>

          <div className="field span-4">
            <label>Work Progress %</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={workProgress}
              onChange={(e) => setWorkProgress(e.target.value)}
            />
          </div>

          <div className="field span-4">
            <label>Expected Completion</label>
            <input
              className="input"
              type="date"
              value={expectedCompletion}
              onChange={(e) => setExpectedCompletion(e.target.value)}
            />
          </div>

          <div className="span-12 line-card" style={{ borderColor: '#dbeafe', background: '#f8fbff' }}>
            <div className="line-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <strong>1. Diagnosis Finding & Technical Solution</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {job.approvalStatus && (
                  <span className={`badge ${job.approvalStatus === 'Approved' ? 'success' : job.approvalStatus === 'Declined' ? 'danger' : 'warning'}`}>
                    Approval: {job.approvalStatus}
                  </span>
                )}
                {canViewFinancials && (
                  <button
                    type="button"
                    className="btn soft"
                    style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    onClick={() => setIsAddServiceModalOpen(true)}
                  >
                    + Add New Service / Issue to DB
                  </button>
                )}
              </div>
            </div>

            {masterServices.length > 0 && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>Quick Fill from Catalog:</span>
                <select
                  className="select"
                  style={{ flex: 1, minWidth: 200, fontSize: '12px' }}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsAddServiceModalOpen(true);
                      e.target.value = '';
                      return;
                    }
                    const s = masterServices.find(x => x.id === e.target.value);
                    if (s) {
                      if (!diagnosedIssue) setDiagnosedIssue(`Defect requiring ${s.name}`);
                      setRecommendedSolution(s.name);
                      if (canViewFinancials) {
                        setQuotationAmount(s.charges || '');
                      }
                      toast(`Applied "${s.name}" to technical solution!`);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Select standard repair service to auto-fill description...</option>
                  {canViewFinancials && (
                    <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      + Add New Service to Catalog (Save to DB)
                    </option>
                  )}
                  {masterServices.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {canViewFinancials ? `— PKR ${parseFloat(s.charges)}` : ''} ({s.duration || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-grid">
              <div className={`field ${canViewFinancials ? 'span-6' : 'span-6'}`}>
                <label>Diagnosed Fault / Cause *</label>
                <input
                  className="input"
                  value={diagnosedIssue}
                  onChange={(e) => setDiagnosedIssue(e.target.value)}
                  placeholder="e.g. Short circuit in charging IC, dead RAM slot"
                />
              </div>
              <div className={`field ${canViewFinancials ? 'span-6' : 'span-6'}`}>
                <label>Recommended Solution / Work *</label>
                <input
                  className="input"
                  value={recommendedSolution}
                  onChange={(e) => setRecommendedSolution(e.target.value)}
                  placeholder="e.g. Replace charging IC, motherboard ultrasonic cleaning"
                />
              </div>
              {canViewFinancials && (
                <div className="field span-4">
                  <label>Quoted Repair Estimate PKR</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quotationAmount}
                    onChange={(e) => setQuotationAmount(e.target.value)}
                    placeholder="Estimated repair charges"
                  />
                </div>
              )}
              <div className={`field ${canViewFinancials ? 'span-8' : 'span-12'}`}>
                <label>Internal Technical Notes (Workbench Notes)</label>
                <input
                  className="input"
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Component serials, thermal paste replaced, board voltages, IC numbers"
                />
              </div>
            </div>
          </div>

          <div className="span-12 line-card">
            <div className="line-card-head">
              <strong>2. Replacement Parts Issued from Inventory</strong>
              <small style={{ color: 'var(--muted)' }}>Select part and quantity used on the workbench</small>
            </div>
            {isDiagnosis && !isApproved ? (
              <div className="notice">Parts issuance is locked until customer approves the quotation.</div>
            ) : (
              <>
                <div className="form-grid">
                  <div className={`field ${canViewFinancials ? 'span-6' : 'span-9'}`}>
                    <label>Select In-Stock Part / Accessory</label>
                    <select
                      className="select"
                      value={selectedPartId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPartId(pid);
                        if (canViewFinancials) {
                          const prod = inStockProducts.find(p => p.id === pid);
                          if (prod) {
                            setPartCustomerCharge(prod.expectedSalePrice || prod.costPrice || '');
                          }
                        }
                      }}
                    >
                      <option value="">None / No part used from stock</option>
                      {inStockProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.brand} {p.model} (Stock: {p.currentStock}) {canViewFinancials ? `— PKR ${parseFloat(p.expectedSalePrice || p.costPrice || 0)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`field ${canViewFinancials ? 'span-2' : 'span-3'}`}>
                    <label>Quantity</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                      disabled={!selectedPartId}
                    />
                  </div>
                  {canViewFinancials && (
                    <div className="field span-4">
                      <label>Charge Customer For Part (PKR)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={partCustomerCharge}
                        onChange={(e) => setPartCustomerCharge(e.target.value)}
                        placeholder="Customer price"
                        disabled={!selectedPartId}
                      />
                    </div>
                  )}
                </div>

                {job.usedParts && job.usedParts.length > 0 && (
                  <div className="table-wrap" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Issued Part</th>
                          <th>Qty</th>
                          {canViewFinancials && <th>Price</th>}
                          {canViewFinancials && <th>Total</th>}
                          <th>Issued By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.usedParts.map((pt, i) => (
                          <tr key={i}>
                            <td><strong>{pt.productCode ? `${pt.productCode} — ` : ''}{pt.name}</strong></td>
                            <td>{pt.quantity}</td>
                            {canViewFinancials && <td>{money(pt.customerCharge)}</td>}
                            {canViewFinancials && <td><strong>{money(pt.quantity * pt.customerCharge)}</strong></td>}
                            <td><span style={{ fontSize: 10, color: 'var(--muted)' }}>{pt.addedBy || 'Tech'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="field span-4">
            <label>Quality Testing & QC Result</label>
            <select
              className="select"
              value={testingResult}
              onChange={(e) => setTestingResult(e.target.value)}
            >
              <option value="Not Tested">Not Tested</option>
              <option value="Passed">QC Passed (All tests OK)</option>
              <option value="Partially Working">Partially Working</option>
              <option value="Failed">Failed / Needs More Work</option>
            </select>
          </div>

          <div className="field span-4">
            <label>Warranty Given (Days)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
            />
          </div>

          <div className="field span-4">
            <label>Customer Final Remarks</label>
            <input
              className="input"
              value={finalRemarks}
              onChange={(e) => setFinalRemarks(e.target.value)}
              placeholder="e.g. Device fully repaired and tested"
            />
          </div>

          <div className="field span-12">
            <label>Update Log Note (Required) *</label>
            <input
              className="input"
              value={updateNote}
              onChange={(e) => setUpdateNote(e.target.value)}
              placeholder="Summary of technical work done in this workbench session..."
              required
            />
          </div>
        </div>
      </form>

      <RepairServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onSuccess={(newSrv) => {
          if (newSrv) {
            setMasterServices(prev => {
              const exists = prev.some(x => x.id === newSrv.id);
              return exists ? prev : [...prev, newSrv];
            });
            if (!diagnosedIssue) setDiagnosedIssue(`Defect requiring ${newSrv.name}`);
            setRecommendedSolution(newSrv.name);
            if (canViewFinancials) {
              setQuotationAmount(newSrv.charges || '');
            }
            toast(`"${newSrv.name}" saved to database catalog and applied!`);
          }
        }}
      />
    </Modal>
  );
}
