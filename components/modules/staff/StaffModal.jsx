'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

export default function StaffModal({
  isOpen,
  onClose,
  staff = null,
  onSuccess
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('sales');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (staff) {
        setUsername(staff.username || '');
        setName(staff.name || '');
        setRole(staff.role || 'sales');
        setDesignation(staff.designation || '');
        setPhone(staff.contact || staff.phone || '');
        setPassword('');
        setStatus(staff.status || 'Active');
      } else {
        setUsername('');
        setName('');
        setRole('sales');
        setDesignation('Sales Executive');
        setPhone('');
        setPassword('');
        setStatus('Active');
      }
    }
  }, [isOpen, staff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      toast('Username and full name are required', 'error');
      return;
    }
    if (!staff && !password) {
      toast('Password is required for new staff account', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = phone ? phone.trim() : '';
      const payload = {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        role,
        designation: designation.trim(),
        contact: cleanPhone,
        phone: cleanPhone,
        status
      };
      if (password) {
        payload.password = password;
      }

      let res;
      if (staff) {
        res = await api.put(`/staff/${staff.id}`, payload);
      } else {
        res = await api.post('/staff', payload);
      }

      if (res && res.success) {
        toast(`Staff member ${staff ? 'updated' : 'created'} successfully!`, 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else if (res && !res.success) {
        toast(res.message || 'Error saving staff member', 'error');
      }
    } catch (err) {
      toast(err.message || 'This user already exists', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={staff ? "Edit Staff Account" : "Add New Staff Member"}
      subtitle="Configure portal access role and credentials"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="staffForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Staff Account'}
          </button>
        </>
      }
    >
      <form id="staffForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-6">
            <label>Full Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Muhammad Ali"
              required
            />
          </div>

          <div className="field span-6">
            <label>Username (Login ID) *</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ali_sales"
              disabled={!!staff}
              required
            />
          </div>

          <div className="field span-6">
            <label>Portal Role *</label>
            <select
              className="select"
              value={role}
              onChange={(e) => {
                const r = e.target.value;
                setRole(r);
                if (r === 'technician') setDesignation('Hardware Repair Specialist');
                else if (r === 'sales') setDesignation('Sales Executive');
                else setDesignation('System Administrator');
              }}
              required
            >
              <option value="sales">Sales Staff Portal</option>
              <option value="technician">Technician Portal</option>
              <option value="admin">Administrator Portal</option>
            </select>
          </div>

          <div className="field span-6">
            <label>Designation / Title</label>
            <input
              className="input"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Senior Laptop Technician"
            />
          </div>

          <div className="field span-6">
            <label>Contact Phone</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03001234567"
            />
          </div>

          <div className="field span-6">
            <label>{staff ? 'Change Password (Leave blank to keep)' : 'Password *'}</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={staff ? 'Leave blank to keep current' : 'Enter login password'}
              required={!staff}
            />
          </div>

          <div className="field span-6">
            <label>Account Status</label>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
