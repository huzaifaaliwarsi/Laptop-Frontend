'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import StaffModal from '../../components/modules/staff/StaffModal';
import { TableRowSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

export default function StaffPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const loadStaff = () => {
    setLoading(true);
    api.get('/staff')
      .then(res => {
        if (res.success) setStaffList(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleToggleStatus = async (staff) => {
    if (staff.id === user?.id) {
      toast('You cannot deactivate your own account.', 'error');
      return;
    }
    if (staff.role === 'admin' || staff.username?.toLowerCase() === 'admin') {
      toast('Branch Administrator accounts can only be activated or deactivated by Super Admin.', 'error');
      return;
    }
    try {
      const currentStatus = String(staff.status).toLowerCase();
      const nextStatus = currentStatus === 'active' ? 'Inactive' : 'Active';

      const res = await api.patch(`/staff/${staff.id}/status`, {
        status: nextStatus
      });

      if (res.success) {
        toast(res.message || `Staff status changed to ${nextStatus}`);
        loadStaff();
      } else {
        toast(res.message || 'Status update failed', 'error');
      }
    } catch (err) {
      toast(err.message || 'Error updating status', 'error');
    }
  };

  const handleDelete = async (staff) => {
    if (staff.id === user?.id) {
      toast('You cannot delete your own account.', 'error');
      return;
    }
    if (staff.role === 'admin' || staff.username?.toLowerCase() === 'admin') {
      toast('Branch Administrator accounts can only be deleted by Super Admin.', 'error');
      return;
    }
    if (!confirm(`Delete staff account for ${staff.name} (${staff.username})?`)) return;
    try {
      const res = await api.delete(`/staff/${staff.id}`);
      if (res.success) {
        toast('Staff member deleted');
        loadStaff();
      }
    } catch (err) {
      toast(err.message || 'Error deleting staff', 'error');
    }
  };

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <h3>Staff & Portal Access Directory</h3>
              <p>Manage system users, login credentials and portal permissions</p>
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={() => setIsAddOpen(true)}
            >
              <Icon name="plus" /> + Add Staff Member
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Portal Role</th>
                  <th>Designation</th>
                  <th>Contact Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowSkeleton cols={8} rows={5} />
                ) : staffList.length > 0 ? (
                  staffList.map((st) => (
                    <tr key={st.id}>
                      <td><strong>{st.id}</strong></td>
                      <td><strong>{st.name}</strong></td>
                      <td><code>{st.username}</code></td>
                      <td>
                        <span className={`badge ${
                          st.role === 'admin' ? 'danger' :
                          st.role === 'technician' ? 'warning' : 'success'
                        }`}>
                          {st.role === 'admin' ? 'Admin' : st.role === 'technician' ? 'Technician' : 'Sales Staff'}
                        </span>
                      </td>
                      <td>{st.designation || 'Staff'}</td>
                      <td>{st.phone || '—'}</td>
                      <td>
                        <span className={`badge ${st.status === 'Active' ? 'success' : 'danger'}`}>
                          {st.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          {st.id !== user?.id && st.role !== 'admin' && st.username?.toLowerCase() !== 'admin' && (
                            <button
                              type="button"
                              className="btn small"
                              onClick={() => handleToggleStatus(st)}
                            >
                              {st.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-action"
                            onClick={() => setEditingStaff(st)}
                            title="Edit Staff"
                          >
                            <Icon name="edit" />
                          </button>
                          {st.id !== user?.id && st.role !== 'admin' && st.username?.toLowerCase() !== 'admin' && (
                            <button
                              type="button"
                              className="icon-action"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDelete(st)}
                              title="Delete Staff"
                            >
                              <Icon name="trash" />
                            </button>
                          )}
                          {st.id === user?.id && (
                            <span className="badge text-2xs font-bold" style={{ background: '#f1f5f9', color: '#64748b' }} title="Your active logged-in account">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No staff accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <StaffModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => loadStaff()}
      />

      <StaffModal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        staff={editingStaff}
        onSuccess={() => loadStaff()}
      />
    </>
  );
}
