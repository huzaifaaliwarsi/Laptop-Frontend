'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Stethoscope,
  Clock,
  Save,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Layers,
  AlertCircle,
  Package
} from 'lucide-react';
import Modal from '../../common/Modal';
import { DetailModalSkeleton } from '../../common/Skeleton';
import { useToast } from '../../common/Toast';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import RepairServiceModal from './RepairServiceModal';
import AddDiagnosisFindingModal from './AddDiagnosisFindingModal';
import RepairPartModal from './RepairPartModal';
import ManageRepairPartsModal from './ManageRepairPartsModal';
import AddAdditionalWorkModal from './AddAdditionalWorkModal';

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
  const canViewFinancials = role === 'admin' || role === 'super_admin' || role === 'sales';

  const [job, setJob] = useState(null);
  const [repairParts, setRepairParts] = useState([]);
  const [masterServices, setMasterServices] = useState([]);
  const [additionalWorkRequests, setAdditionalWorkRequests] = useState([]);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isDiagnosisFindingModalOpen, setIsDiagnosisFindingModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isManagePartsModalOpen, setIsManagePartsModalOpen] = useState(false);
  const [isAdditionalWorkModalOpen, setIsAdditionalWorkModalOpen] = useState(false);
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

  // Additional service addition
  const [isAddingExtraService, setIsAddingExtraService] = useState(false);
  const [extraServiceId, setExtraServiceId] = useState('');
  const [extraServiceName, setExtraServiceName] = useState('');
  const [extraServiceDuration, setExtraServiceDuration] = useState('');
  const [extraServiceCondition, setExtraServiceCondition] = useState('');
  const [extraServiceCharge, setExtraServiceCharge] = useState('');
  const [addingService, setAddingService] = useState(false);

  const loadJob = () => {
    if (!jobId) return;
    setLoading(true);
    Promise.all([
      api.get(`/repairs/${jobId}`),
      api.get('/repair-parts?status=Active'),
      api.get('/repair-services?status=Active'),
      api.get(`/repairs/${jobId}/additional-work`)
    ]).then(([jRes, pRes, sRes, aRes]) => {
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
        setIsAddingExtraService(false);
        setExtraServiceId('');
        setExtraServiceName('');
        setExtraServiceDuration('');
        setExtraServiceCondition('');
        setExtraServiceCharge('');
      }
      if (pRes.success) setRepairParts(pRes.data || []);
      if (sRes.success) setMasterServices(sRes.data || []);
      if (aRes.success) setAdditionalWorkRequests(aRes.data || []);
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

  const handleApproveQuote = async () => {
    if (!confirm(`Approve quotation of PKR ${parseFloat(job.quotationAmount || 0)} on behalf of customer?`)) return;
    try {
      const res = await api.post(`/repairs/${job.id}/approve`);
      if (res.success) {
        toast('Quotation approved and repair authorized!');
        loadJob();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error approving quotation', 'error');
    }
  };

  const handleDeclineQuote = async () => {
    if (!confirm('Decline quotation on behalf of customer? No repair work will proceed.')) return;
    try {
      const res = await api.post(`/repairs/${job.id}/decline`);
      if (res.success) {
        toast('Quotation declined.');
        loadJob();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error declining quotation', 'error');
    }
  };

  const handleAddExtraServiceLine = async () => {
    if (!extraServiceName.trim()) {
      toast('Service or issue name is required', 'error');
      return;
    }
    setAddingService(true);
    try {
      const res = await api.post(`/repairs/${job.id}/services`, {
        serviceId: extraServiceId || null,
        name: extraServiceName.trim(),
        charges: canViewFinancials && extraServiceCharge !== '' ? parseFloat(extraServiceCharge) : 0,
        duration: extraServiceDuration.trim(),
        condition: extraServiceCondition.trim()
      });
      if (res.success) {
        toast(`Added "${extraServiceName}" to service order!`);
        setIsAddingExtraService(false);
        setExtraServiceId('');
        setExtraServiceName('');
        setExtraServiceDuration('');
        setExtraServiceCondition('');
        setExtraServiceCharge('');
        loadJob();
        if (onSuccess) onSuccess(res.data?.job || res.data);
      }
    } catch (err) {
      toast(err.message || 'Error adding service line', 'error');
    } finally {
      setAddingService(false);
    }
  };

  const handleRemoveServiceLine = async (lineId, lineName) => {
    if (!confirm(`Are you sure you want to remove service "${lineName}" from this job?`)) return;
    try {
      const res = await api.delete(`/repairs/${job.id}/services/${lineId}`);
      if (res.success) {
        toast(`Removed "${lineName}" from service order.`);
        loadJob();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error removing service line', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        updateNote: updateNote.trim() || undefined
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
      {/* Top Financial & Status Overview Band */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: canViewFinancials ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(3, 1fr)',
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
          <span className={`badge ${job.status === 'Work in Progress' || job.status === 'Repair Approved' ? 'success' : job.status.includes('Waiting') ? 'warning' : 'info'}`} style={{ fontWeight: 700, fontSize: 12 }}>
            {job.status}
          </span>
        </div>

        {canViewFinancials ? (
          <>
            <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Total Bill</span>
              <strong style={{ fontSize: 14, color: '#1e293b' }}>{money(job.total)}</strong>
            </div>
            <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Paid / Advance</span>
              <strong style={{ fontSize: 14, color: '#16a34a' }}>{money(job.paid)}</strong>
            </div>
            <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Balance Due</span>
              <strong style={{ fontSize: 14, color: job.remaining > 0 ? '#dc2626' : '#16a34a' }}>{money(job.remaining)}</strong>
            </div>
          </>
        ) : (
          <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Target Date</span>
            <strong style={{ fontSize: 13, color: '#1e293b' }}>{expectedCompletion || 'In Progress'}</strong>
          </div>
        )}
      </div>

      {/* Customer Complaint / Reported Defect */}
      {job.problem && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #3b82f6',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <FileText size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong style={{ color: '#334155', marginRight: 6 }}>Customer Complaint:</strong>
            <span style={{ color: '#0f172a' }}>{job.problem}</span>
          </div>
        </div>
      )}

      <form id="techJobUpdateForm" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isDiagnosis ? (
            /* =========================================================================
               SERVICE JOB VIEW: Assigned Services Checklist & Work Execution
            ========================================================================= */
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wrench size={16} color="#2563eb" />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: 13 }}>1. Service Checklist & Tasks</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ fontSize: 11, padding: '5px 12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => setIsAdditionalWorkModalOpen(true)}
                  >
                    <Plus size={13} /> Propose Additional Fault
                  </button>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ fontSize: 11, padding: '5px 12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => setIsAddingExtraService(!isAddingExtraService)}
                  >
                    <Plus size={13} /> {isAddingExtraService ? 'Cancel' : 'Direct Add Service'}
                  </button>
                </div>
              </div>

              {job.lines && job.lines.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {job.lines.map((line, idx) => (
                    <div
                      key={line.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#dbeafe',
                          color: '#1e40af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 11
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <strong style={{ color: '#1e293b', fontSize: 13 }}>{line.name}</strong>
                          {line.quantity > 1 && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                              (Qty: {line.quantity})
                            </span>
                          )}
                          {line.condition && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {line.condition}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ textAlign: 'right' }}>
                          {line.duration && (
                            <span className="badge info" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={10} /> {line.duration}
                            </span>
                          )}
                          {canViewFinancials && line.charges !== null && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>
                              {money(line.charges * (line.quantity || 1))}
                            </div>
                          )}
                        </div>

                        {job.lines.length > 1 && (
                          <button
                            type="button"
                            className="icon-action"
                            style={{ color: 'var(--danger)', padding: 4 }}
                            title="Remove service line"
                            onClick={() => handleRemoveServiceLine(line.id, line.name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 14, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
                  Standard General Service (No specific service lines attached)
                </div>
              )}

              {/* Display Discovered Additional Fault Requests & Approvals */}
              {additionalWorkRequests && additionalWorkRequests.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={13} color="#2563eb" /> Additional Fault Approval Status:
                  </div>
                  {additionalWorkRequests.map(req => {
                    const isPending = req.status === 'Pending Approval';
                    const isApproved = req.status === 'Approved';
                    return (
                      <div
                        key={req.id}
                        style={{
                          padding: '10px 14px',
                          background: isPending ? '#fffbeb' : isApproved ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${isPending ? '#fde047' : isApproved ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`badge ${isPending ? 'warning' : isApproved ? 'success' : 'danger'}`} style={{ fontSize: 10, fontWeight: 700 }}>
                              {isPending ? '⏳ WAITING APPROVAL' : isApproved ? '✅ APPROVED' : '❌ DECLINED'}
                            </span>
                            <strong style={{ fontSize: 12, color: '#1e293b' }}>{req.recommended_service}</strong>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {req.fault_finding}
                          </div>
                        </div>

                        {canViewFinancials && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                            + {money(req.total_quotation)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direct Add Extra Service In-line Box */}
              {isAddingExtraService && (
                <div style={{
                  marginTop: 12,
                  padding: 14,
                  background: '#eff6ff',
                  borderRadius: 8,
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                    Direct Add Extra Service Line
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: canViewFinancials ? '1fr 140px 140px' : '1fr 140px', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Pre-defined Service</label>
                      <select
                        className="select"
                        value={extraServiceId}
                        style={{ fontSize: 12, height: 36 }}
                        onChange={(e) => {
                          const sid = e.target.value;
                          setExtraServiceId(sid);
                          const s = masterServices.find(x => x.id === sid);
                          if (s) {
                            setExtraServiceName(s.name);
                            if (canViewFinancials) setExtraServiceCharge(s.charges || '');
                            if (s.duration) setExtraServiceDuration(s.duration);
                            if (s.conditions) setExtraServiceCondition(s.conditions);
                          }
                        }}
                      >
                        <option value="">Custom Service (or pick from catalog)...</option>
                        {masterServices.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} {canViewFinancials ? `— PKR ${parseFloat(s.charges)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Est. Duration</label>
                      <input
                        className="input"
                        style={{ fontSize: 12, height: 36 }}
                        placeholder="e.g. 1-2 Hours"
                        value={extraServiceDuration}
                        onChange={(e) => setExtraServiceDuration(e.target.value)}
                      />
                    </div>

                    {canViewFinancials && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Price PKR</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ fontSize: 12, height: 36 }}
                          placeholder="0.00"
                          value={extraServiceCharge}
                          onChange={(e) => setExtraServiceCharge(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Service / Issue Name *</label>
                      <input
                        className="input"
                        style={{ fontSize: 12, height: 36 }}
                        placeholder="e.g. Broken Hinges Repair, Type-C Cleaning"
                        value={extraServiceName}
                        onChange={(e) => setExtraServiceName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Defect Notes</label>
                      <input
                        className="input"
                        style={{ fontSize: 12, height: 36 }}
                        placeholder="e.g. Left hinge mount cracked"
                        value={extraServiceCondition}
                        onChange={(e) => setExtraServiceCondition(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: 11, padding: '4px 12px' }}
                      onClick={() => {
                        setIsAddingExtraService(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ fontSize: 11, padding: '4px 16px', fontWeight: 600 }}
                      onClick={handleAddExtraServiceLine}
                      disabled={addingService || !extraServiceName.trim()}
                    >
                      {addingService ? 'Adding...' : 'Add Service to Job'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* =========================================================================
               DIAGNOSIS JOB VIEW: Diagnostic Finding, Issue, Solution & Quotation
            ========================================================================= */
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stethoscope size={16} color="#0284c7" />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: 13 }}>1. Diagnosis Finding & Technical Solution</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ fontSize: 11, padding: '4px 10px', fontWeight: 600 }}
                    onClick={() => setIsDiagnosisFindingModalOpen(true)}
                  >
                    <Plus size={12} /> Add New Finding to DB
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Quick Fill:</span>
                <select
                  className="select"
                  style={{ flex: 1, minWidth: 200, fontSize: 12, height: 34 }}
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
                      if (canViewFinancials) setQuotationAmount(s.charges || '');
                      if (s.duration) setExpectedCompletion(s.duration);
                      toast(`Applied "${s.name}" to technical solution!`);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Select standard repair service to auto-fill...</option>
                  <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    + Add New Finding to DB Catalog
                  </option>
                  {masterServices.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {canViewFinancials ? `— PKR ${parseFloat(s.charges)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Diagnosed Fault / Cause *</label>
                  <input
                    className="input"
                    value={diagnosedIssue}
                    onChange={(e) => setDiagnosedIssue(e.target.value)}
                    placeholder="e.g. Short circuit in charging IC TPS51225"
                    style={{ fontSize: 12, height: 38 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Recommended Solution / Work *</label>
                  <input
                    className="input"
                    value={recommendedSolution}
                    onChange={(e) => setRecommendedSolution(e.target.value)}
                    placeholder="e.g. Replace charging IC, motherboard ultrasonic cleaning"
                    style={{ fontSize: 12, height: 38 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: canViewFinancials ? '160px 1fr' : '1fr', gap: 12, marginTop: 12 }}>
                {canViewFinancials && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Quoted Estimate PKR</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={quotationAmount}
                      onChange={(e) => setQuotationAmount(e.target.value)}
                      placeholder="Estimate PKR"
                      style={{ fontSize: 12, height: 38 }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Internal Technical Notes</label>
                  <input
                    className="input"
                    value={technicalNotes}
                    onChange={(e) => setTechnicalNotes(e.target.value)}
                    placeholder="Component serials, board voltages, IC numbers"
                    style={{ fontSize: 12, height: 38 }}
                  />
                </div>
              </div>

              {job.status === 'Waiting for Customer Approval' && (
                <div style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  background: '#fffbeb',
                  borderRadius: 8,
                  border: '1px solid #fde047',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge warning" style={{ fontWeight: 700, fontSize: 11 }}>
                        ⏳ WAITING CUSTOMER APPROVAL
                      </span>
                      <strong style={{ fontSize: 12, color: '#854d0e' }}>
                        Quotation: {money(job.quotationAmount)}
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      WhatsApp approval request dispatched. Work execution & parts will unlock upon approval.
                    </div>
                  </div>

                  {canViewFinancials && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn success small"
                        style={{ fontWeight: 700 }}
                        onClick={handleApproveQuote}
                      >
                        Approve ({money(job.quotationAmount)})
                      </button>
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={handleDeclineQuote}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}

              {job.approval_status === 'Approved' && (
                <div style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span className="badge success" style={{ fontWeight: 700, fontSize: 11 }}>✅ APPROVED</span>
                  <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                    Quotation approved — Hardware repair authorized.
                  </span>
                </div>
              )}

              {job.approval_status === 'Declined' && (
                <div style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#fef2f2',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span className="badge danger" style={{ fontWeight: 700, fontSize: 11 }}>❌ DECLINED</span>
                  <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                    Customer declined quotation. No hardware repair authorized.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
             SECTION 2: Workshop Repair Spare Parts
          ========================================================================= */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={16} color="#16a34a" />
                </div>
                <div>
                  <strong style={{ color: '#0f172a', fontSize: 13 }}>2. Spare Parts Consumption</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn soft"
                  style={{ fontSize: 11, padding: '4px 10px', fontWeight: 600 }}
                  onClick={() => setIsManagePartsModalOpen(true)}
                >
                  Manage Parts Catalog
                </button>
              </div>
            </div>

            {isDiagnosis && !isApproved ? (
              <div className="notice" style={{ fontSize: 12 }}>
                Spare parts issuance is locked until customer approves the quotation.
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: canViewFinancials ? 'minmax(240px, 1fr) 140px 70px 110px' : 'minmax(240px, 1fr) 70px 110px',
                  gap: 10,
                  alignItems: 'flex-end',
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Spare Part</label>
                    <select
                      className="select"
                      style={{ fontSize: 12, height: 36 }}
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
                          if (partObj) setPartCustomerCharge(partObj.sellingPrice || '');
                        }
                      }}
                    >
                      <option value="">Select spare part from catalog...</option>
                      <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        + Add New Spare Part to Database
                      </option>
                      {repairParts.map(p => (
                        <option key={p.id} value={p.id}>
                          [{p.category}] {p.code} — {p.name} (Stock: {p.currentStock}) {canViewFinancials ? `— PKR ${p.sellingPrice}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {canViewFinancials && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Price PKR</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        style={{ fontSize: 12, height: 36 }}
                        value={partCustomerCharge}
                        onChange={(e) => setPartCustomerCharge(e.target.value)}
                        placeholder="Price"
                        disabled={!selectedPartId}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Qty</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      style={{ fontSize: 12, height: 36, textAlign: 'center' }}
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                      disabled={!selectedPartId}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ width: '100%', height: 36, fontSize: 11, fontWeight: 600 }}
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
                          <th style={{ width: 100, textAlign: 'center' }}>Action</th>
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
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn danger"
                                  style={{ padding: '2px 6px', fontSize: 10 }}
                                  onClick={() => handleRemoveUsedPart(pt.id, pt.name)}
                                  title="Remove"
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

          {/* =========================================================================
             SECTION 3: Bench Observations, QC Testing & Status Update
          ========================================================================= */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} color="#7c3aed" />
              </div>
              <div>
                <strong style={{ color: '#0f172a', fontSize: 13 }}>3. Workbench Observations, QC & Status Update</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!isDiagnosis && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Service Observations & Technical Notes
                  </label>
                  <input
                    className="input"
                    style={{ fontSize: 12, height: 38 }}
                    value={technicalNotes}
                    onChange={(e) => setTechnicalNotes(e.target.value)}
                    placeholder="e.g. Cleaned fan blades, fresh MX-4 applied, thermal stress test 68°C"
                  />
                </div>
              )}

              {/* Row 1: Status, Progress, Expected Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Update Status *</label>
                  <select
                    className="select"
                    style={{ fontSize: 12, height: 38 }}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                  >
                    {!isDiagnosis ? (
                      <optgroup label="Service Execution">
                        <option value="Job Received">Job Received</option>
                        <option value="Work in Progress">Work in Progress</option>
                        <option value="Waiting for Parts">Waiting for Parts</option>
                        <option value="Testing & Quality Check">Testing & Quality Check</option>
                        <option value="Work Completed">Work Completed</option>
                        <option value="Ready for Delivery">Ready for Delivery</option>
                      </optgroup>
                    ) : (
                      <>
                        {!isApproved ? (
                          <optgroup label="Diagnosis Phase">
                            <option value="Diagnosis Received">Diagnosis Received</option>
                            <option value="Diagnosis in Progress">Diagnosis in Progress</option>
                            <option value="Diagnosis Completed">Diagnosis Completed</option>
                            <option value="Waiting for Customer Approval">Waiting for Customer Approval</option>
                          </optgroup>
                        ) : (
                          <optgroup label="Approved Repair">
                            <option value="Repair Approved">Repair Approved</option>
                            <option value="Work in Progress">Work in Progress</option>
                            <option value="Waiting for Parts">Waiting for Parts</option>
                            <option value="Testing & Quality Check">Testing & Quality Check</option>
                            <option value="Work Completed">Work Completed</option>
                            <option value="Ready for Delivery">Ready for Delivery</option>
                          </optgroup>
                        )}
                      </>
                    )}
                    <optgroup label="Close / Return">
                      <option value="Cancelled">Cancelled</option>
                      <option value="Returned Without Repair">Returned Without Repair</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Work Progress %</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    style={{ fontSize: 12, height: 38 }}
                    value={workProgress}
                    onChange={(e) => setWorkProgress(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Expected Completion</label>
                  <input
                    className="input"
                    type="date"
                    style={{ fontSize: 12, height: 38 }}
                    value={expectedCompletion}
                    onChange={(e) => setExpectedCompletion(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: QC, Warranty, Remarks */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>QC Testing Result</label>
                  <select
                    className="select"
                    style={{ fontSize: 12, height: 38 }}
                    value={testingResult}
                    onChange={(e) => setTestingResult(e.target.value)}
                  >
                    <option value="Not Tested">Not Tested</option>
                    <option value="Passed">QC Passed (All OK)</option>
                    <option value="Partially Working">Partially Working</option>
                    <option value="Failed">Failed / Needs Work</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Warranty Given (Days)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    style={{ fontSize: 12, height: 38 }}
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Customer Final Remarks</label>
                  <input
                    className="input"
                    style={{ fontSize: 12, height: 38 }}
                    value={finalRemarks}
                    onChange={(e) => setFinalRemarks(e.target.value)}
                    placeholder="e.g. Device fully repaired and tested"
                  />
                </div>
              </div>

              {/* Row 3: Update Log Note */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Update Log Note (Optional)</label>
                <input
                  className="input"
                  style={{ fontSize: 12, height: 38 }}
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder="Summary of technical work done in this session..."
                />
              </div>
            </div>
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

      <AddAdditionalWorkModal
        isOpen={isAdditionalWorkModalOpen}
        onClose={() => setIsAdditionalWorkModalOpen(false)}
        job={job}
        onSuccess={() => loadJob()}
      />
    </Modal>
  );
}
