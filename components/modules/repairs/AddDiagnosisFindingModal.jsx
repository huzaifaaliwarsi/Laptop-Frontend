'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

const FAULT_CATEGORIES = [
  'Motherboard / Chip-level Fault',
  'Power & Charging Circuit Issue',
  'Display & Graphics Fault',
  'Keyboard & Trackpad Defect',
  'Storage & Boot Failure',
  'RAM / Memory Defect',
  'Cooling, Fan & Overheating',
  'BIOS / Firmware Corruption',
  'Liquid / Water Damage',
  'Hinges, Casing & Physical Damage',
  'Port / Connector Broken',
  'General Diagnosis & Inspection'
];

export default function AddDiagnosisFindingModal({
  isOpen,
  onClose,
  initialFault = '',
  initialSolution = '',
  onApply
}) {
  const { toast } = useToast();
  const [faultName, setFaultName] = useState('');
  const [faultCategory, setFaultCategory] = useState('Motherboard / Chip-level Fault');
  const [solutionWork, setSolutionWork] = useState('');
  const [charges, setCharges] = useState('');
  const [duration, setDuration] = useState('1-2 Days');
  const [requiredPartsNote, setRequiredPartsNote] = useState('');
  const [warrantyConditions, setWarrantyConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFaultName(initialFault || '');
      setSolutionWork(initialSolution || '');
      setFaultCategory('Motherboard / Chip-level Fault');
      setCharges('');
      setDuration('1-2 Days');
      setRequiredPartsNote('');
      setWarrantyConditions('30 Days warranty on repair work');
    }
  }, [isOpen, initialFault, initialSolution]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!faultName.trim()) {
      toast('Diagnosed fault / issue name is required', 'error');
      return;
    }
    if (!solutionWork.trim()) {
      toast('Recommended solution / repair work is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const numCharges = charges !== '' ? parseFloat(charges) : 0;
      const combinedConditions = [
        warrantyConditions.trim(),
        requiredPartsNote.trim() ? `Parts: ${requiredPartsNote.trim()}` : ''
      ].filter(Boolean).join(' • ');

      // Save to standard repair_services in database
      const payload = {
        name: `${faultName.trim()} — ${solutionWork.trim()}`,
        serviceType: 'repair',
        charges: isNaN(numCharges) ? 0 : numCharges,
        duration: duration.trim() || '1-2 Days',
        conditions: combinedConditions || undefined,
        status: 'Active'
      };

      const res = await api.post('/repair-services', payload);
      if (res.success) {
        toast('New diagnosed issue & solution saved to database catalog!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:repair-services-updated'));
        }

        // Apply immediately to the active technician job card
        if (onApply) {
          onApply({
            faultName: faultName.trim(),
            solutionWork: solutionWork.trim(),
            charges: numCharges > 0 ? numCharges : '',
            duration: duration.trim(),
            technicalNotes: requiredPartsNote.trim() ? `Required parts / ICs: ${requiredPartsNote.trim()}` : ''
          });
        }
        onClose();
      }
    } catch (err) {
      toast(err.message || 'Error saving diagnosis finding', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Diagnosed Issue & Repair Solution"
      subtitle="Define a new hardware defect and standard technical solution in the database"
      size="large"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="diagnosisFindingForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving to DB...' : 'Save to DB & Apply to Job'}
          </button>
        </>
      }
    >
      <form id="diagnosisFindingForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-7">
            <label>Diagnosed Fault / Issue Title *</label>
            <input
              type="text"
              className="input"
              required
              value={faultName}
              onChange={(e) => setFaultName(e.target.value)}
              placeholder="e.g. Charging Section Short Circuit / No Power"
            />
          </div>

          <div className="field span-5">
            <label>Fault Category *</label>
            <select
              className="select"
              value={faultCategory}
              onChange={(e) => setFaultCategory(e.target.value)}
            >
              {FAULT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="field span-12">
            <label>Recommended Solution / Repair Work to Perform *</label>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              required
              value={solutionWork}
              onChange={(e) => setSolutionWork(e.target.value)}
              placeholder="e.g. Replace TPS51225 3V/5V Standby IC, resolder shorted filtering capacitor on main rail, and ultrasonic board cleaning."
            />
          </div>

          <div className="field span-4">
            <label>Estimated Labor / Service Charge (PKR)</label>
            <input
              type="number"
              className="input"
              min="0"
              step="0.01"
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
              placeholder="e.g. 3500 (Optional for Tech)"
            />
          </div>

          <div className="field span-4">
            <label>Estimated Turnaround Duration</label>
            <input
              type="text"
              className="input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 2-3 Hours, 1-2 Days"
            />
          </div>

          <div className="field span-4">
            <label>Warranty Terms</label>
            <input
              type="text"
              className="input"
              value={warrantyConditions}
              onChange={(e) => setWarrantyConditions(e.target.value)}
              placeholder="e.g. 30 Days logic board warranty"
            />
          </div>

          <div className="field span-12">
            <label>Required Replacement Components / ICs (Workbench Note)</label>
            <input
              type="text"
              className="input"
              value={requiredPartsNote}
              onChange={(e) => setRequiredPartsNote(e.target.value)}
              placeholder="e.g. TPS51225RUKR QFN-20 IC, 10uF 25V 0805 SMD Capacitor"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
