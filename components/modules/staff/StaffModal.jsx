'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

export default function StaffModal({
  isOpen,
  onClose,
  staff = null,
  onSuccess
}) {
  const { toast } = useToast();
  const { user } = useAuth();
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

  // Primary branch admin username 'admin' is protected for routing
  const isPrimaryAdmin = !!(staff && String(staff.username || '').toLowerCase() === 'admin');
  const isSelfOrAdmin = !!(staff && (
    String(staff.id) === String(user?.id) ||
    staff.role === 'admin' ||
    String(staff.username || '').toLowerCase() === 'admin'
  ));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanName = name.trim();

    if (!cleanUser || !cleanName) {
      toast('Username and full name are required', 'error');
      return;
    }
    if (!staff && !password) {
      toast('Password is required for new staff account', 'error');
      return;
    }
    if (isSelfOrAdmin && status === 'Inactive') {
      toast('You cannot deactivate your own account or an administrator account.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = phone ? phone.trim() : '';
      const payload = {
        username: cleanUser,
        name: cleanName,
        role,
        designation: designation ? designation.trim() : '',
        contact: cleanPhone,
        phone: cleanPhone,
        status: isSelfOrAdmin ? 'Active' : status
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
      toast(err.message || 'This username or phone already exists', 'error');
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
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="staffForm"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (staff ? 'Update Account' : 'Save Staff Account')}
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
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="e.g. ali_sales"
              required
              disabled={isPrimaryAdmin}
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
              disabled={isSelfOrAdmin}
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
              value={isSelfOrAdmin ? 'Active' : status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isSelfOrAdmin}
            >
              <option value="Active">Active</option>
              {!isSelfOrAdmin && <option value="Inactive">Inactive</option>}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
