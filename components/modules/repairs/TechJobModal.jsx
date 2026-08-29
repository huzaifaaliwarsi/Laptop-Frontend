'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { DetailModalSkeleton } from '../../common/Skeleton';
import { useToast } from '../../common/Toast';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import RepairServiceModal from './RepairServiceModal';
import AddDiagnosisFindingModal from './AddDiagnosisFindingModal';
import RepairPartModal from './RepairPartModal';
import ManageRepairPartsModal from './ManageRepairPartsModal';

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
  const [repairParts, setRepairParts] = useState([]);
  const [masterServices, setMasterServices] = useState([]);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isDiagnosisFindingModalOpen, setIsDiagnosisFindingModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isManagePartsModalOpen, setIsManagePartsModalOpen] = useState(false);
  const [editingUsedPart, setEditingUsedPart] = useState(null);
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
      api.get('/repair-parts?status=Active'),
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
      if (pRes.success) setRepairParts(pRes.data || []);
      if (sRes.success) setMasterServices(sRes.data || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handlePartsUpdate = () => {
      api.get('/repair-parts?status=Active').then(res => {
        if (res.success) setRepairParts(res.data || []);
      }).catch(console.error);
    };
    window.addEventListener('app:repair-parts-updated', handlePartsUpdate);
    return () => window.removeEventListener('app:repair-parts-updated', handlePartsUpdate);
  }, []);

  useEffect(() => {
    if (isOpen && jobId) {
      loadJob();
    }
  }, [isOpen, jobId]);

  if (!job && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading Workbench..." wide={true}>
        <DetailModalSkeleton />
      </Modal>
    );
  }

  if (!job) return null;

  const isDiagnosis = job.jobType === 'Diagnosis Job' || job.originJobType === 'Diagnosis Job';
  const isApproved = !isDiagnosis || job.approvalStatus === 'Approved' || ['Repair Approved', 'Work in Progress', 'Waiting for Parts', 'Work Completed', 'Ready for Delivery', 'Delivered & Closed'].includes(job.status);

  const handleRemoveUsedPart = async (usedPartId, partName) => {
    if (!confirm(`Are you sure you want to remove issued part "${partName}"? The quantity will be automatically returned to spare parts inventory.`)) return;
    try {
      const res = await api.delete(`/repairs/${job.id}/parts/${usedPartId}`);
      if (res.success) {
        toast(`Spare part removed and returned to stock.`);
        loadJob();
        window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error removing spare part', 'error');
    }
  };

  const handleEditUsedPart = async (pt) => {
    const newQtyStr = prompt(`Update quantity for ${pt.name}:`, pt.quantity);
    if (newQtyStr === null) return;
    const newQty = parseInt(newQtyStr, 10);
    if (isNaN(newQty) || newQty <= 0) {
      toast('Quantity must be a number greater than 0', 'error');
      return;
    }

    let newCharge = pt.customerCharge;
    if (canViewFinancials) {
      const newChargeStr = prompt(`Update charged price PKR for ${pt.name}:`, pt.customerCharge);
      if (newChargeStr !== null) {
        const parsedCharge = parseFloat(newChargeStr);
        if (!isNaN(parsedCharge) && parsedCharge >= 0) {
          newCharge = parsedCharge;
        }
      }
    }

    try {
      const res = await api.put(`/repairs/${job.id}/parts/${pt.id}`, {
        quantity: newQty,
        customerCharge: newCharge
      });
      if (res.success) {
        toast(`Issued part updated.`);
        loadJob();
        window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error updating issued part', 'error');
    }
  };

  const handleIssuePartDirectly = async () => {
    if (!selectedPartId) {
      toast('Please select a spare part to issue', 'error');
      return;
    }
    const qty = parseInt(partQty || 1, 10);
    if (isNaN(qty) || qty <= 0) {
      toast('Valid quantity greater than 0 is required', 'error');
      return;
    }

    try {
      const res = await api.post(`/repairs/${job.id}/parts`, {
        partId: selectedPartId,
        quantity: qty,
        customerCharge: canViewFinancials ? parseFloat(partCustomerCharge || 0) : undefined
      });
      if (res.success) {
        toast('Spare part issued to job successfully!');
        setSelectedPartId('');
        setPartQty(1);
        setPartCustomerCharge('');
        loadJob();
        window.dispatchEvent(new CustomEvent('app:repair-parts-updated'));
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error issuing spare part', 'error');
    }
  };

  const handleSaveCurrentFindingToDB = async () => {
    if (!diagnosedIssue.trim()) {
      toast('Please enter a diagnosed fault first', 'error');
      return;
    }
    if (!recommendedSolution.trim()) {
      toast('Please enter a recommended solution first', 'error');
      return;
    }

    try {
      const srvName = `${diagnosedIssue.trim()} — ${recommendedSolution.trim()}`;
      const res = await api.post('/repair-services', {
        name: srvName,
        serviceType: 'repair',
        charges: canViewFinancials && quotationAmount !== '' ? parseFloat(quotationAmount) : 0,
        duration: expectedCompletion || '1-2 Days',
        conditions: technicalNotes.trim() || undefined,
        status: 'Active'
      });

      if (res.success) {
        toast(`"${srvName}" saved to standard database catalog!`);
        setMasterServices(prev => [res.data, ...prev]);
        window.dispatchEvent(new CustomEvent('app:repair-services-updated'));
      }
    } catch (err) {
      toast(err.message || 'Error saving finding to catalog', 'error');
    }
  };

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
        updateNote: updateNote.trim()
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
      title={`Technician Workbench — ${job.trackingId}`}
      subtitle={`Customer: ${job.customerName} (${job.contact}) • Device: ${job.brand || ''} ${job.model || ''}`}
      wide={true}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Close
          </button>
          <button
            type="submit"
            form="techJobUpdateForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Workbench Update'}
          </button>
        </>
      }
    >
      <div className="repair-finance-band" style={{ marginBottom: 14 }}>
        <div className="repair-finance-card">
          <span>Job Type</span>
          <strong style={{ color: 'var(--primary)' }}>{job.jobType}</strong>
        </div>
        <div className="repair-finance-card">
          <span>Current Status</span>
          <strong>{job.status}</strong>
        </div>
        {canViewFinancials ? (
          <>
            <div className="repair-finance-card">
              <span>Total Service & Parts Bill</span>
              <strong>{money(job.total)}</strong>
            </div>
            <div className="repair-finance-card">
              <span>Advance / Collected</span>
              <strong style={{ color: 'var(--success)' }}>{money(job.paid)}</strong>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <strong>Customer Complaint / Reported Defect:</strong>
        </div>
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
              <div>
                <strong>1. Diagnosis Finding & Technical Solution</strong>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                  Record inspected defect, chip-level finding & recommended repair work
                </small>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn soft"
                  style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={() => setIsDiagnosisFindingModalOpen(true)}
                >
                  + Add New Issue & Solution to DB
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>Quick Fill from Catalog:</span>
              <select
                className="select"
                style={{ flex: 1, minWidth: 200, fontSize: '12px' }}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsDiagnosisFindingModalOpen(true);
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
                    if (s.duration) {
                      setExpectedCompletion(s.duration);
                    }
                    toast(`Applied "${s.name}" to technical solution!`);
                  }
                  e.target.value = '';
                }}
              >
                <option value="">Select standard repair service / issue to auto-fill description...</option>
                <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                  + Add New Issue & Repair Solution to DB (Save to DB)
                </option>
                {masterServices.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {canViewFinancials ? `— PKR ${parseFloat(s.charges)}` : ''} ({s.duration || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="field span-6">
                <label>Diagnosed Fault / Cause *</label>
                <input
                  className="input"
                  value={diagnosedIssue}
                  onChange={(e) => setDiagnosedIssue(e.target.value)}
                  placeholder="e.g. Short circuit in charging IC TPS51225, dead RAM slot"
                />
              </div>
              <div className="field span-6">
                <label>Recommended Solution / Work *</label>
                <input
                  className="input"
                  value={recommendedSolution}
                  onChange={(e) => setRecommendedSolution(e.target.value)}
                  placeholder="e.g. Replace charging IC, motherboard ultrasonic cleaning & trace repair"
                />
              </div>

              {diagnosedIssue && recommendedSolution && (
                <div className="span-12" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 600 }}
                    onClick={handleSaveCurrentFindingToDB}
                    title="Save this custom fault & solution to database catalog for future jobs"
                  >
                    💾 Save This Finding to Catalog
                  </button>
                </div>
              )}

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
            <div className="line-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>2. Workshop Repair Spare Parts</strong>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                  Screens, Batteries, Keyboards, ICs, Ports, RAM & SSD components
                </small>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn soft"
                  style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}
                  onClick={() => setIsManagePartsModalOpen(true)}
                >
                  Manage Spare Parts Catalog
                </button>
                <button
                  type="button"
                  className="btn soft"
                  style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={() => setIsPartModalOpen(true)}
                >
                  + Add New Part to DB
                </button>
              </div>
            </div>

            {isDiagnosis && !isApproved ? (
              <div className="notice">Spare parts issuance is locked until customer approves the quotation.</div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: canViewFinancials ? 'minmax(260px, 1fr) 160px 80px 110px' : 'minmax(260px, 1fr) 80px 110px',
                  gap: 10,
                  alignItems: 'flex-end',
                  background: '#f8fafc',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid var(--border)'
                }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 600 }}>Select Workshop Spare Part</label>
                    <select
                      className="select"
                      value={selectedPartId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        if (pid === '__NEW__') {
                          setIsPartModalOpen(true);
                          return;
                        }
                        setSelectedPartId(pid);
                        if (canViewFinancials) {
                          const partObj = repairParts.find(p => p.id === pid);
                          if (partObj) {
                            setPartCustomerCharge(partObj.sellingPrice || '');
                          }
                        }
                      }}
                    >
                      <option value="">None / Select spare part from workshop catalog...</option>
                      <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        + Add New Spare Part to Database Catalog
                      </option>
                      {repairParts.map(p => (
                        <option key={p.id} value={p.id}>
                          [{p.category}] {p.code} — {p.name} (In Stock: {p.currentStock}) {canViewFinancials ? `— PKR ${p.sellingPrice}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {canViewFinancials && (
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 600 }}>Customer Price PKR</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={partCustomerCharge}
                        onChange={(e) => setPartCustomerCharge(e.target.value)}
                        placeholder="Price PKR"
                        disabled={!selectedPartId}
                      />
                    </div>
                  )}

                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 600 }}>Qty</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                      disabled={!selectedPartId}
                      style={{ textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ margin: 0 }}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ width: '100%', height: 38, fontSize: 11, fontWeight: 700 }}
                      onClick={handleIssuePartDirectly}
                      disabled={!selectedPartId}
                    >
                      + Issue Part
                    </button>
                  </div>
                </div>

                {/* Issued Parts Table */}
                {job.usedParts && job.usedParts.length > 0 && (
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Issued Spare Part</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                          {canViewFinancials && <th style={{ width: 100, textAlign: 'right' }}>Unit Price</th>}
                          {canViewFinancials && <th style={{ width: 110, textAlign: 'right' }}>Total</th>}
                          <th style={{ width: 90 }}>Issued By</th>
                          <th style={{ width: 110, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.usedParts.map((pt, i) => (
                          <tr key={i}>
                            <td>
                              <strong>{pt.productCode ? `${pt.productCode} — ` : ''}{pt.name}</strong>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 800 }}>{pt.quantity}</td>
                            {canViewFinancials && <td style={{ textAlign: 'right' }}>{money(pt.customerCharge)}</td>}
                            {canViewFinancials && <td style={{ textAlign: 'right', fontWeight: 800 }}>{money(pt.quantity * pt.customerCharge)}</td>}
                            <td><span style={{ fontSize: 10, color: 'var(--muted)' }}>{pt.addedBy || 'Tech'}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn soft"
                                  style={{ padding: '2px 6px', fontSize: 10 }}
                                  onClick={() => handleEditUsedPart(pt)}
                                  title="Edit quantity or price"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn danger"
                                  style={{ padding: '2px 6px', fontSize: 10 }}
                                  onClick={() => handleRemoveUsedPart(pt.id, pt.name)}
                                  title="Remove part and return stock to inventory"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
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

      <AddDiagnosisFindingModal
        isOpen={isDiagnosisFindingModalOpen}
        onClose={() => setIsDiagnosisFindingModalOpen(false)}
        initialFault={diagnosedIssue}
        initialSolution={recommendedSolution}
        onApply={({ faultName, solutionWork, charges, duration, technicalNotes: partsNote }) => {
          setDiagnosedIssue(faultName);
          setRecommendedSolution(solutionWork);
          if (canViewFinancials && charges !== '') {
            setQuotationAmount(charges);
          }
          if (duration) {
            setExpectedCompletion(duration);
          }
          if (partsNote) {
            setTechnicalNotes(prev => prev ? `${prev} | ${partsNote}` : partsNote);
          }
          // Refresh catalog services
          api.get('/repair-services?status=Active').then(r => {
            if (r.success && Array.isArray(r.data)) setMasterServices(r.data);
          }).catch(console.error);
        }}
      />

      <RepairPartModal
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
        onSuccess={(newPart) => {
          if (newPart) {
            setRepairParts(prev => [newPart, ...prev]);
            setSelectedPartId(newPart.id);
            if (canViewFinancials) {
              setPartCustomerCharge(newPart.sellingPrice || '');
            }
            toast(`"${newPart.name}" added to spare parts catalog!`);
          }
        }}
      />

      <ManageRepairPartsModal
        isOpen={isManagePartsModalOpen}
        onClose={() => setIsManagePartsModalOpen(false)}
        onSelectPart={(selectedPart) => {
          if (selectedPart) {
            setSelectedPartId(selectedPart.id);
            if (canViewFinancials) {
              setPartCustomerCharge(selectedPart.sellingPrice || '');
            }
          }
        }}
      />
    </Modal>
  );
}
