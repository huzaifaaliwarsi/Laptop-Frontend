'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import RepairServiceModal from './RepairServiceModal';
import ManageRepairCategoriesModal from '../../common/ManageRepairCategoriesModal';

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
  const [repairCategories, setRepairCategories] = useState([]);
  const [masterServices, setMasterServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Common Job fields
  const [jobType, setJobType] = useState('Service Job');
  const [technicianId, setTechnicianId] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  
  // Category field (PostgreSQL repair_categories)
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  
  const [productType, setProductType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [problem, setProblem] = useState('');

  // Service Job specific state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [catalogRefPrice, setCatalogRefPrice] = useState('');
  const [serviceChargeInput, setServiceChargeInput] = useState('');
  const [serviceQtyInput, setServiceQtyInput] = useState('1');
  const [serviceDurationInput, setServiceDurationInput] = useState('');

  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceCharge, setCustomServiceCharge] = useState('');
  const [customServiceQty, setCustomServiceQty] = useState('1');
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

  const loadCategories = useCallback(() => {
    api.get('/categories/repair?activeOnly=true')
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setRepairCategories(res.data);
          // If no category selected yet, default to first category
          if (res.data.length > 0 && !categoryId) {
            setCategoryId(String(res.data[0].id));
            setCategoryName(res.data[0].name);
            setProductType(res.data[0].name);
          }
        }
      })
      .catch(console.error);
  }, [categoryId]);

  const loadInitialData = () => {
    Promise.all([
      api.get('/staff?role=technician'),
      api.get('/categories/repair?activeOnly=true'),
      api.get('/repair-services?status=Active')
    ]).then(([tRes, cRes, sRes]) => {
      if (tRes.success) setTechnicians(tRes.data || []);
      if (cRes.success && Array.isArray(cRes.data)) {
        setRepairCategories(cRes.data);
        if (cRes.data.length > 0) {
          setCategoryId(String(cRes.data[0].id));
          setCategoryName(cRes.data[0].name);
          setProductType(cRes.data[0].name);
        }
      }
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
      setBrand('');
      setModel('');
      setSerial('');
      setProblem('');
      setLines([]);
      setSelectedServiceId('');
      setCatalogRefPrice('');
      setServiceChargeInput('');
      setServiceQtyInput('1');
      setServiceDurationInput('');
      setCustomServiceName('');
      setCustomServiceCharge('');
      setCustomServiceQty('1');
      setCustomServiceDuration('');
      setExtraEnabled('No');
      setExtraCharges('');
      setExtraReason('');
      setPaid('');
      setPaymentMethod('Cash');
      setPaymentReference('');
      setRemarks('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleCatUpdate = () => {
      loadCategories();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('app:repair-categories-updated', handleCatUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:repair-categories-updated', handleCatUpdate);
      }
    };
  }, [loadCategories]);

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

  const handleCategoryChange = (e) => {
    const id = e.target.value;
    if (id === '__MANAGE__') {
      setIsCategoryModalOpen(true);
      return;
    }
    setCategoryId(id);
    const cat = repairCategories.find(c => String(c.id) === String(id));
    if (cat) {
      setCategoryName(cat.name);
      setProductType(cat.name);
    }
  };

  const handleSelectMasterService = (srvId) => {
    setSelectedServiceId(srvId);
    if (!srvId) {
      setCatalogRefPrice('');
      setServiceChargeInput('');
      setServiceDurationInput('');
      return;
    }

    const s = masterServices.find(x => x.id === srvId);
    if (s) {
      const p = parseFloat(s.charges || 0);
      setCatalogRefPrice(p);
      setServiceChargeInput(p.toString());
      setServiceDurationInput(s.duration || '');
      setServiceQtyInput('1');
    }
  };

  const handleAddMasterService = () => {
    if (!selectedServiceId) {
      toast('Please select a service from catalog', 'warning');
      return;
    }
    const s = masterServices.find(x => x.id === selectedServiceId);
    if (!s) return;

    const charge = parseFloat(serviceChargeInput);
    if (isNaN(charge) || charge < 0) {
      toast('Please enter a valid non-negative charged price', 'error');
      return;
    }

    const qty = parseInt(serviceQtyInput || 1, 10);
    if (isNaN(qty) || qty <= 0) {
      toast('Quantity must be at least 1', 'error');
      return;
    }

    const catPrice = catalogRefPrice !== '' ? parseFloat(catalogRefPrice) : charge;

    setLines(prev => [...prev, {
      serviceId: s.id,
      name: s.name,
      catalogPriceSnapshot: catPrice,
      charges: charge,
      quantity: qty,
      duration: serviceDurationInput.trim() || s.duration || '',
      condition: s.conditions || ''
    }]);

    setSelectedServiceId('');
    setCatalogRefPrice('');
    setServiceChargeInput('');
    setServiceQtyInput('1');
    setServiceDurationInput('');
  };

  const handleAddCustomLine = () => {
    if (!customServiceName.trim() || customServiceCharge === '') {
      toast('Please enter custom service name and charges', 'warning');
      return;
    }
    const charge = parseFloat(customServiceCharge);
    if (isNaN(charge) || charge < 0) {
      toast('Please enter a valid non-negative charged price', 'error');
      return;
    }

    const qty = parseInt(customServiceQty || 1, 10);
    if (isNaN(qty) || qty <= 0) {
      toast('Quantity must be at least 1', 'error');
      return;
    }

    setLines(prev => [...prev, {
      serviceId: null,
      name: customServiceName.trim(),
      catalogPriceSnapshot: charge,
      charges: charge,
      quantity: qty,
      duration: customServiceDuration.trim(),
      condition: 'Custom intake charge'
    }]);

    setCustomServiceName('');
    setCustomServiceCharge('');
    setCustomServiceQty('1');
    setCustomServiceDuration('');
  };

  const handleUpdateLinePrice = (index, newPrice) => {
    const p = parseFloat(newPrice);
    if (isNaN(p) || p < 0) return;
    setLines(prev => prev.map((l, i) => i === index ? { ...l, charges: p } : l));
  };

  const handleUpdateLineQty = (index, newQty) => {
    const q = parseInt(newQty, 10);
    if (isNaN(q) || q <= 0) return;
    setLines(prev => prev.map((l, i) => i === index ? { ...l, quantity: q } : l));
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const isDiag = jobType === 'Diagnosis Job';
  const linesTotal = lines.reduce((sum, l) => sum + (parseFloat(l.charges || 0) * parseInt(l.quantity || 1, 10)), 0);
  const extraAmt = !isDiag && extraEnabled === 'Yes' ? parseFloat(extraCharges || 0) : 0;
  const grandTotal = isDiag ? parseFloat(diagnosisFee || 0) : (linesTotal + extraAmt);
  const numPaid = paid === '' ? 0 : parseFloat(paid || 0);
  const balance = Math.max(0, grandTotal - numPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoryId) {
      toast('Repair Category is required', 'error');
      return;
    }

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
        categoryId: parseInt(categoryId, 10),
        categoryName: categoryName.trim() || productType,
        productType: categoryName.trim() || productType || 'Laptop',
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
        payload.lines = lines.map(l => ({
          serviceId: l.serviceId || null,
          name: l.name,
          catalogPriceSnapshot: l.catalogPriceSnapshot,
          charges: parseFloat(l.charges || 0),
          quantity: parseInt(l.quantity || 1, 10),
          duration: l.duration || '',
          condition: l.condition || ''
        }));
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Repair Job"
        subtitle="Intake ticket with category classification, editable service pricing and customer WhatsApp sync"
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

            {/* Category selection (sourced from PostgreSQL repair_categories) */}
            <div className="field span-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Repair Category *</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Manage Repair Categories"
                >
                  + Add / Edit
                </button>
              </div>
              <select
                className="select"
                value={categoryId}
                onChange={handleCategoryChange}
                required
              >
                <option value="">Select Category...</option>
                {repairCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__MANAGE__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                  + Manage Repair Categories...
                </option>
              </select>
            </div>

            <div className="field span-3">
              <label>Brand</label>
              <input
                className="input"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Dell, HP, Apple, Samsung, etc."
              />
            </div>

            <div className="field span-3">
              <label>Model</label>
              <input
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Latitude 5400, iPhone 13, etc."
              />
            </div>

            <div className="field span-3">
              <label>Serial / Tag Number</label>
              <input
                className="input"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Service tag or serial number"
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
                  <div>
                    <strong>Repair Services</strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 8 }}>
                      (Default DB prices appear automatically & can be customized per repair)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    onClick={() => setIsAddServiceModalOpen(true)}
                  >
                    + Add New Service to Catalog
                  </button>
                </div>

                {/* Catalog Service Picker with Editable Charged Price */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(280px, 1fr) 200px 80px 145px',
                  gap: 12,
                  alignItems: 'flex-end',
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div className="field" style={{ margin: 0, width: '100%' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: 'block' }}>Master Service Catalog</label>
                    <select
                      className="select"
                      style={{ width: '100%', height: 38 }}
                      value={selectedServiceId}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsAddServiceModalOpen(true);
                          setSelectedServiceId('');
                        } else {
                          handleSelectMasterService(e.target.value);
                        }
                      }}
                    >
                      <option value="">Select standard repair service from master catalog</option>
                      <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        + Add New Service to Catalog (Save to DB)
                      </option>
                      {repairCatalogServices.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — DB Price: PKR {parseFloat(s.charges)} ({s.duration || 'Standard'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field" style={{ margin: 0, width: '100%' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: 'block', whiteSpace: 'nowrap' }}>
                      Charged Price PKR * {catalogRefPrice !== '' && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 10 }}>({money(catalogRefPrice)})</span>}
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%', height: 38 }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceChargeInput}
                      onChange={(e) => setServiceChargeInput(e.target.value)}
                      placeholder="Price PKR"
                    />
                  </div>

                  <div className="field" style={{ margin: 0, width: '100%' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: 'block' }}>Qty</label>
                    <input
                      className="input"
                      style={{ width: '100%', height: 38, textAlign: 'center' }}
                      type="number"
                      min="1"
                      value={serviceQtyInput}
                      onChange={(e) => setServiceQtyInput(e.target.value)}
                      placeholder="1"
                    />
                  </div>

                  <div style={{ margin: 0, width: '100%' }}>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleAddMasterService}
                      disabled={!selectedServiceId}
                      style={{ width: '100%', height: 38, fontWeight: 700, justifyContent: 'center' }}
                    >
                      + Add Service
                    </button>
                  </div>
                </div>

                {/* Custom Service Line Entry */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #dce6f2' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 1fr) 200px 80px 145px',
                    gap: 12,
                    alignItems: 'flex-end',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <div className="field" style={{ margin: 0, width: '100%' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }}>Custom Service Name</label>
                      <input
                        className="input"
                        style={{ width: '100%', height: 38 }}
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        placeholder="Custom repair service name"
                      />
                    </div>
                    <div className="field" style={{ margin: 0, width: '100%' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }}>Charges PKR</label>
                      <input
                        className="input"
                        style={{ width: '100%', height: 38 }}
                        type="number"
                        min="0"
                        step="0.01"
                        value={customServiceCharge}
                        onChange={(e) => setCustomServiceCharge(e.target.value)}
                        placeholder="Price PKR"
                      />
                    </div>
                    <div className="field" style={{ margin: 0, width: '100%' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }}>Qty</label>
                      <input
                        className="input"
                        style={{ width: '100%', height: 38, textAlign: 'center' }}
                        type="number"
                        min="1"
                        value={customServiceQty}
                        onChange={(e) => setCustomServiceQty(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div style={{ margin: 0, width: '100%' }}>
                      <button
                        type="button"
                        className="btn soft"
                        onClick={handleAddCustomLine}
                        style={{ width: '100%', height: 38, fontWeight: 600, justifyContent: 'center' }}
                      >
                        + Custom Line
                      </button>
                    </div>
                  </div>
                </div>

                {/* Added Service Lines Table with Inline Editable Price & Qty */}
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Service Name</th>
                        <th>Duration</th>
                        <th style={{ width: 110 }}>Catalog Ref</th>
                        <th style={{ width: 140 }}>Charged Price (PKR)</th>
                        <th style={{ width: 80 }}>Qty</th>
                        <th style={{ width: 130, textAlign: 'right' }}>Line Total</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length > 0 ? (
                        lines.map((line, idx) => {
                          const unitPrice = parseFloat(line.charges || 0);
                          const qty = parseInt(line.quantity || 1, 10);
                          const lTotal = unitPrice * qty;
                          const isPriceEdited = line.catalogPriceSnapshot !== undefined && line.catalogPriceSnapshot !== null && line.catalogPriceSnapshot !== unitPrice;

                          return (
                            <tr key={idx}>
                              <td>
                                <strong>{line.name}</strong>
                                {isPriceEdited && (
                                  <span style={{ fontSize: 10, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3, marginLeft: 6, fontWeight: 700 }}>
                                    Edited Price
                                  </span>
                                )}
                              </td>
                              <td style={{ fontSize: 12 }}>{line.duration || '—'}</td>
                              <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                                {line.catalogPriceSnapshot !== null && line.catalogPriceSnapshot !== undefined ? money(line.catalogPriceSnapshot) : 'Custom'}
                              </td>
                              <td>
                                <input
                                  className="input small"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.charges}
                                  onChange={(e) => handleUpdateLinePrice(idx, e.target.value)}
                                  style={{ fontWeight: 700, width: '100%' }}
                                  title="Edit charged unit price for this repair"
                                />
                              </td>
                              <td>
                                <input
                                  className="input small"
                                  type="number"
                                  min="1"
                                  value={line.quantity || 1}
                                  onChange={(e) => handleUpdateLineQty(idx, e.target.value)}
                                  style={{ width: '100%', textAlign: 'center' }}
                                />
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800 }}>
                                {money(lTotal)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ color: 'var(--danger)', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16 }}
                                  onClick={() => handleRemoveLine(idx)}
                                  title="Remove service line"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}>
                            No services added yet. Select from catalog, customize price, or add a custom line.
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
              // Automatically add this new service directly to the ticket lines with its DB price!
              const p = parseFloat(newSrv.charges || 0);
              setLines(prev => [...prev, {
                serviceId: newSrv.id,
                name: newSrv.name,
                catalogPriceSnapshot: p,
                charges: p,
                quantity: 1,
                duration: newSrv.duration || '',
                condition: newSrv.conditions || ''
              }]);
              toast(`"${newSrv.name}" saved to database catalog and added to this job!`);
            }
          }}
        />

        {/* Manage Repair Categories Modal */}
        <ManageRepairCategoriesModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            loadCategories();
          }}
          selectedCategoryId={categoryId}
          onSelectCategory={(cat) => {
            if (cat) {
              setCategoryId(String(cat.id));
              setCategoryName(cat.name);
              setProductType(cat.name);
            }
            loadCategories();
          }}
          onCategoriesUpdated={() => loadCategories()}
        />
      </Modal>
    </>
  );
}
