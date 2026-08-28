'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import RepairServiceModal from './RepairServiceModal';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function CreateRepairJobModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState([]);
  const [masterServices, setMasterServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

  const [jobType, setJobType] = useState('Service Job');
  const [technicianId, setTechnicianId] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [productType, setProductType] = useState('Laptop');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [problem, setProblem] = useState('');

  // Service Job specific state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceCharge, setCustomServiceCharge] = useState('');
  const [customServiceDuration, setCustomServiceDuration] = useState('');
  const [lines, setLines] = useState([]);
  const [extraEnabled, setExtraEnabled] = useState('No');
  const [extraCharges, setExtraCharges] = useState('');
  const [extraReason, setExtraReason] = useState('');

  // Diagnosis Job specific state
  const [diagnosisServiceId, setDiagnosisServiceId] = useState('');
  const [diagnosisServiceName, setDiagnosisServiceName] = useState('');
  const [diagnosisFee, setDiagnosisFee] = useState('1000');
  const [diagnosisDuration, setDiagnosisDuration] = useState('1-2 Hours');

  // Payment & Remarks
  const [paid, setPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [remarks, setRemarks] = useState('');

  const loadInitialData = () => {
    Promise.all([
      api.get('/staff?role=technician'),
      api.get('/repair-services?status=Active')
    ]).then(([tRes, sRes]) => {
      if (tRes.success) setTechnicians(tRes.data || []);
      if (sRes.success) {
        const sList = sRes.data || [];
        setMasterServices(sList);
        const defaultDiag = sList.find(s => (s.serviceType || 'repair') === 'diagnosis');
        if (defaultDiag) {
          setDiagnosisServiceId(defaultDiag.id);
          setDiagnosisServiceName(defaultDiag.name);
          setDiagnosisFee(defaultDiag.charges || 1000);
          setDiagnosisDuration(defaultDiag.duration || '1-2 Hours');
        } else {
          setDiagnosisServiceName('Standard Laptop Diagnosis & Inspection');
          setDiagnosisFee(1000);
          setDiagnosisDuration('1-2 Hours');
        }
      }
    }).catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setJobType('Service Job');
      setTechnicianId('');
      setPriority('Normal');
      setDate(new Date().toISOString().split('T')[0]);
      setExpectedCompletion('');
      setCustomerName('');
      setContact('');
      setProductType('Laptop');
      setBrand('');
      setModel('');
      setSerial('');
      setProblem('');
      setLines([]);
      setExtraEnabled('No');
      setExtraCharges('');
      setExtraReason('');
      setPaid('');
      setPaymentMethod('Cash');
      setPaymentReference('');
      setRemarks('');
    }
  }, [isOpen]);

  const repairCatalogServices = masterServices.filter(s => (s.serviceType || 'repair') === 'repair');
  const diagnosisCatalogServices = masterServices.filter(s => (s.serviceType || 'repair') === 'diagnosis');

  const handleJobTypeChange = (newType) => {
    setJobType(newType);
    setPaid('');
    if (newType === 'Diagnosis Job') {
      setLines([]);
      setExtraEnabled('No');
      setExtraCharges('');
      setExtraReason('');
      const defaultDiag = diagnosisCatalogServices[0] || masterServices.find(s => (s.serviceType || 'repair') === 'diagnosis');
      if (defaultDiag) {
        setDiagnosisServiceId(defaultDiag.id);
        setDiagnosisServiceName(defaultDiag.name);
        setDiagnosisFee(defaultDiag.charges || 1000);
        setDiagnosisDuration(defaultDiag.duration || '1-2 Hours');
      } else {
        setDiagnosisServiceName('Standard Laptop Diagnosis & Inspection');
        setDiagnosisFee(1000);
        setDiagnosisDuration('1-2 Hours');
      }
    } else {
      setDiagnosisServiceId('');
      setDiagnosisServiceName('');
      setDiagnosisFee('');
      setDiagnosisDuration('');
    }
  };

  const handleAddMasterService = () => {
    if (!selectedServiceId) return;
    const s = masterServices.find(x => x.id === selectedServiceId);
    if (!s) return;

    setLines(prev => [...prev, {
      serviceId: s.id,
      name: s.name,
      charges: parseFloat(s.charges || 0),
      duration: s.duration || '',
      condition: s.conditions || ''
    }]);

    setSelectedServiceId('');
  };

  const handleAddCustomLine = () => {
    if (!customServiceName.trim() || customServiceCharge === '') return;
    const charge = parseFloat(customServiceCharge);
    if (isNaN(charge) || charge < 0) return;

    setLines(prev => [...prev, {
      serviceId: null,
      name: customServiceName.trim(),
      charges: charge,
      duration: customServiceDuration.trim(),
      condition: 'Custom intake charge'
    }]);

    setCustomServiceName('');
    setCustomServiceCharge('');
    setCustomServiceDuration('');
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const isDiag = jobType === 'Diagnosis Job';
  const linesTotal = lines.reduce((sum, l) => sum + parseFloat(l.charges || 0), 0);
  const extraAmt = !isDiag && extraEnabled === 'Yes' ? parseFloat(extraCharges || 0) : 0;
  const grandTotal = isDiag ? parseFloat(diagnosisFee || 0) : (linesTotal + extraAmt);
  const numPaid = paid === '' ? 0 : parseFloat(paid || 0);
  const balance = Math.max(0, grandTotal - numPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !contact.trim() || !problem.trim()) {
      toast('Customer name, contact and reported problem are required', 'error');
      return;
    }

    if (!isDiag && lines.length === 0) {
      toast('Service Job requires at least one repair service line', 'error');
      return;
    }

    if (isDiag && (isNaN(parseFloat(diagnosisFee)) || parseFloat(diagnosisFee) < 0)) {
      toast('Valid diagnosis fee is required for Diagnosis Job', 'error');
      return;
    }

    if (numPaid < 0) {
      toast('Paid advance cannot be negative', 'error');
      return;
    }

    if (numPaid > grandTotal + 0.005) {
      toast(`Paid amount (${money(numPaid)}) cannot exceed total bill of ${money(grandTotal)}`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jobType,
        technicianId: technicianId || null,
        priority,
        date,
        expectedCompletion: expectedCompletion || null,
        customerName: customerName.trim(),
        contact: contact.trim(),
        productType,
        brand: brand.trim(),
        model: model.trim(),
        serial: serial.trim(),
        problem: problem.trim(),
        paid: numPaid,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        remarks: remarks.trim()
      };

      if (isDiag) {
        payload.diagnosisServiceId = diagnosisServiceId || null;
        payload.diagnosisServiceName = diagnosisServiceName.trim() || 'Standard Laptop Diagnosis & Inspection';
        payload.diagnosisFee = parseFloat(diagnosisFee || 0);
        payload.diagnosisDuration = diagnosisDuration.trim() || '1-2 Hours';
      } else {
        payload.lines = lines;
        payload.extraEnabled = extraEnabled;
        payload.extraCharges = extraAmt;
        payload.extraReason = extraReason.trim();
      }

      const res = await api.post('/repairs', payload);
      if (res.success) {
        toast(`Repair Job ${res.data.tracking_id} created successfully!`);
        onClose();
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      toast(err.message || 'Error creating repair job', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Repair Job"
      subtitle="Intake ticket with automatic tracking ID and customer WhatsApp sync"
      wide={true}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="createRepairJobForm"
            className="btn primary"
            disabled={submitting || (!isDiag && lines.length === 0) || (isDiag && (isNaN(parseFloat(diagnosisFee)) || parseFloat(diagnosisFee) < 0))}
          >
            {submitting ? 'Creating...' : `Create Job (${money(grandTotal)})`}
          </button>
        </>
      }
    >
      <form id="createRepairJobForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-4">
            <label>Job Type *</label>
            <select
              className="select"
              value={jobType}
              onChange={(e) => handleJobTypeChange(e.target.value)}
              required
            >
              <option value="Service Job">Service Job (Direct Repair)</option>
              <option value="Diagnosis Job">Diagnosis Job (Inspection & Quote Approval Required)</option>
            </select>
          </div>

          <div className="field span-4">
            <label>Assign Technician</label>
            <select
              className="select"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">Unassigned (Assign Later)</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.designation || 'Technician'})</option>
              ))}
            </select>
          </div>

          <div className="field span-4">
            <label>Priority</label>
            <select
              className="select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="field span-4">
            <label>Customer Name *</label>
            <input
              className="input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              required
            />
          </div>

          <div className="field span-4">
            <label>Contact Number *</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="03001234567"
              required
            />
          </div>

          <div className="field span-4">
            <label>{isDiag ? 'Expected Inspection Date' : 'Expected Completion Date'}</label>
            <input
              className="input"
              type="date"
              value={expectedCompletion}
              onChange={(e) => setExpectedCompletion(e.target.value)}
            />
          </div>

          <div className="field span-3">
            <label>Product Type</label>
            <select
              className="select"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
            >
              <option value="Laptop">Laptop</option>
              <option value="PC">PC / Desktop</option>
              <option value="LCD">LCD / Monitor</option>
              <option value="Printer">Printer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="field span-3">
            <label>Brand</label>
            <input
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Dell, HP, Lenovo, etc."
            />
          </div>

          <div className="field span-3">
            <label>Model</label>
            <input
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Latitude 5400, etc."
            />
          </div>

          <div className="field span-3">
            <label>Serial / Tag Number</label>
            <input
              className="input"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="Service tag or serial"
            />
          </div>

          <div className="field span-12">
            <label>Reported Problem / Issue Description *</label>
            <textarea
              className="textarea"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe the defect, damage, or customer complaint..."
              required
            />
          </div>

          {/* Conditional Intake Section: Service Job vs Diagnosis Job */}
          {!isDiag ? (
            /* Service Job: Repair Services */
            <div className="span-12 line-card">
              <div className="line-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong>Repair Services</strong>
                <button
                  type="button"
                  className="btn soft"
                  style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={() => setIsAddServiceModalOpen(true)}
                >
                  + Add New Service to Catalog
                </button>
              </div>

              <div className="form-grid">
                <div className="field span-8">
                  <select
                    className="select"
                    value={selectedServiceId}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsAddServiceModalOpen(true);
                        setSelectedServiceId('');
                      } else {
                        setSelectedServiceId(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select standard repair service from master catalog</option>
                    <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      + Add New Service to Catalog (Save to DB)
                    </option>
                    {repairCatalogServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — PKR {parseFloat(s.charges)} ({s.duration || 'Standard'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field span-4" style={{ alignSelf: 'end' }}>
                  <button type="button" className="btn primary" onClick={handleAddMasterService} style={{ width: '100%' }}>
                    + Add Catalog Service
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #dce6f2' }}>
                <div className="form-grid">
                  <div className="field span-5">
                    <input
                      className="input"
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      placeholder="Custom repair service name"
                    />
                  </div>
                  <div className="field span-3">
                    <input
                      className="input"
                      type="number"
                      value={customServiceCharge}
                      onChange={(e) => setCustomServiceCharge(e.target.value)}
                      placeholder="Charges PKR"
                    />
                  </div>
                  <div className="field span-2">
                    <input
                      className="input"
                      value={customServiceDuration}
                      onChange={(e) => setCustomServiceDuration(e.target.value)}
                      placeholder="Duration"
                    />
                  </div>
                  <div className="field span-2" style={{ alignSelf: 'end' }}>
                    <button type="button" className="btn soft" onClick={handleAddCustomLine} style={{ width: '100%' }}>
                      + Custom Line
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Duration</th>
                      <th style={{ width: 140 }}>Charges</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length > 0 ? (
                      lines.map((line, idx) => (
                        <tr key={idx}>
                          <td><strong>{line.name}</strong></td>
                          <td>{line.duration || '—'}</td>
                          <td><strong>{money(line.charges)}</strong></td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ color: 'var(--danger)', border: 0, background: 'transparent' }}
                              onClick={() => handleRemoveLine(idx)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 12 }}>
                          No services added yet. Select from catalog, create a new master service, or add a custom line.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Diagnosis Job: Diagnosis / Inspection */
            <div className="span-12 line-card" style={{ borderColor: '#dbeafe', background: '#f8fbff' }}>
              <div className="line-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong>Diagnosis / Inspection</strong>
                <span style={{ fontSize: '11px', color: '#1e40af', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  Inspection & Quote Approval Required
                </span>
              </div>

              <div className="form-grid">
                <div className="field span-6">
                  <label>Diagnosis Service / Inspection Type *</label>
                  <select
                    className="select"
                    value={diagnosisServiceId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiagnosisServiceId(val);
                      const s = masterServices.find(x => x.id === val);
                      if (s) {
                        setDiagnosisServiceName(s.name);
                        setDiagnosisFee(s.charges || 0);
                        setDiagnosisDuration(s.duration || '1-2 Hours');
                      }
                    }}
                  >
                    {diagnosisCatalogServices.length > 0 ? (
                      diagnosisCatalogServices.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — PKR {parseFloat(s.charges)} ({s.duration || 'Standard'})
                        </option>
                      ))
                    ) : (
                      <option value="">Standard Laptop Diagnosis & Inspection — PKR 1,000</option>
                    )}
                  </select>
                </div>

                <div className="field span-3">
                  <label>Diagnosis Fee PKR *</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={diagnosisFee}
                    onChange={(e) => setDiagnosisFee(e.target.value)}
                    placeholder="1000"
                    required
                  />
                </div>

                <div className="field span-3">
                  <label>Estimated Diagnosis Duration</label>
                  <input
                    className="input"
                    value={diagnosisDuration}
                    onChange={(e) => setDiagnosisDuration(e.target.value)}
                    placeholder="1-2 Hours"
                  />
                </div>

                <div className="field span-12" style={{ marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                    ℹ️ <strong>Diagnosis Policy:</strong> Hardware repair charges are determined after technician inspection on the workbench. The customer will receive a formal quotation for approval before any repair work or parts consumption begins.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="field span-12">
            <label>Internal Technical / Intake Remarks</label>
            <input
              className="input"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Accessories received with device (Charger, Bag, etc.)"
            />
          </div>

          {/* Extra Overheads (Service Jobs only) */}
          {!isDiag && (
            <>
              <div className="field span-3">
                <label>Extra Charges Applicable?</label>
                <select
                  className="select"
                  value={extraEnabled}
                  onChange={(e) => setExtraEnabled(e.target.value)}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {extraEnabled === 'Yes' && (
                <>
                  <div className="field span-3">
                    <label>Extra Amount PKR *</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="field span-6">
                    <label>Reason for Extra Charges *</label>
                    <input
                      className="input"
                      value={extraReason}
                      onChange={(e) => setExtraReason(e.target.value)}
                      placeholder="Urgent handling, courier fee, etc."
                      required
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Payment Section */}
          <div className="field span-4">
            <label>Payment Method</label>
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online Bank Transfer</option>
            </select>
          </div>

          <div className="field span-4">
            <label>{isDiag ? 'Advance / Diagnosis Fee Paid Now' : 'Advance Payment Paid Now'}</label>
            <input
              className="input"
              type="number"
              min="0"
              max={grandTotal}
              step="0.01"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder="0 (Advance payment)"
            />
          </div>

          <div className="field span-4">
            <label>Payment Reference / Slip</label>
            <input
              className="input"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Slip No. or Note"
            />
          </div>

          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>{isDiag ? 'Diagnosis Fee' : 'Service Total'}</span>
              <strong>{money(isDiag ? diagnosisFee : linesTotal)}</strong>
            </div>
            {!isDiag && extraAmt > 0 && (
              <div className="summary-row">
                <span>Extra Charges</span>
                <strong>{money(extraAmt)}</strong>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Intake Bill</span>
              <strong>{money(grandTotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Advance Paid</span>
              <strong>{money(numPaid)}</strong>
            </div>
            <div className="summary-row" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              <span>Balance (Customer Receivable)</span>
              <strong>{money(balance)}</strong>
            </div>
          </div>
        </div>
      </form>

      {/* Inline Create Repair Service Modal */}
      <RepairServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onSuccess={(newSrv) => {
          if (newSrv) {
            setMasterServices(prev => {
              const exists = prev.some(x => x.id === newSrv.id);
              return exists ? prev : [...prev, newSrv];
            });
            // Automatically add this new service directly to the ticket lines!
            setLines(prev => [...prev, {
              serviceId: newSrv.id,
              name: newSrv.name,
              charges: parseFloat(newSrv.charges || 0),
              duration: newSrv.duration || '',
              condition: newSrv.conditions || ''
            }]);
            toast(`"${newSrv.name}" saved to database catalog and added to this job!`);
          }
        }}
      />
    </Modal>
  );
}
