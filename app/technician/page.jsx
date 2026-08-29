'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import TechJobModal from '../../components/modules/repairs/TechJobModal';
import ProgressLoader from '../../components/common/ProgressLoader';

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function TechnicianDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const loadDashboard = () => {
    setLoading(true);
    api.get('/reports/dashboard')
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const counts = data?.counts || {};
  const dueJobs = data?.dueJobs || [];
  const recentJobs = data?.recentJobs || [];

  return (
    <>
      <div className="tech-profile-band">
        <div>
          <h3>Technician Workstation</h3>
          <p>
            Welcome, <strong>{user?.name || 'Technician'}</strong>. View your assigned diagnostic and service jobs.
          </p>
        </div>
        <div className="tech-profile-badge">
          <span>Active Assigned Queue</span>
          <strong>{(counts.newJobs || 0) + (counts.checkingJobs || 0) + (counts.activeJobs || 0)} Repair Jobs</strong>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid cols-4">
        <div className="stat">
          <div className="stat-top">
            <span>NEW ASSIGNED</span>
            <span className="stat-icon"><Icon name="clipboard" /></span>
          </div>
          <div className="stat-value">{counts.newJobs || 0}</div>
          <div className="stat-note">Waiting for initial diagnosis</div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span>IN DIAGNOSIS / APPROVAL</span>
            <span className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><Icon name="clock" /></span>
          </div>
          <div className="stat-value">{counts.checkingJobs || 0}</div>
          <div className="stat-note">Diagnosis & quote approval</div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span>REPAIR IN PROGRESS</span>
            <span className="stat-icon" style={{ background: '#eff6ff', color: 'var(--blue-600)' }}><Icon name="wrench" /></span>
          </div>
          <div className="stat-value">{counts.activeJobs || 0}</div>
          <div className="stat-note">Active repair work & parts</div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span>READY & COMPLETED</span>
            <span className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><Icon name="checkCircle" /></span>
          </div>
          <div className="stat-value">{counts.completedJobs || 0}</div>
          <div className="stat-note">QC passed & ready for pickup</div>
        </div>
      </div>

      {/* Grid: Due Deadlines & Active Queue */}
      <div className="grid cols-2" style={{ marginTop: 14 }}>
        {/* Due Deadlines */}
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h3>Due Today / High Priority Jobs</h3>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Customer</th>
                    <th>Device</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <ProgressLoader tableRow colSpan={6} compact message="Please wait while urgent tasks are loading..." />
                  ) : dueJobs.length > 0 ? (
                    dueJobs.map(job => (
                      <tr key={job.id}>
                        <td><strong>{job.tracking_id}</strong></td>
                        <td>{job.customer_name}</td>
                        <td>{[job.brand, job.model].filter(Boolean).join(' ') || 'Device'}</td>
                        <td>
                          <span className={`badge ${job.priority === 'Urgent' ? 'danger' : 'warning'}`}>
                            {job.priority}
                          </span>
                        </td>
                        <td>{fmtDate(job.expected_completion)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn small primary"
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            Workbench
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                        No urgent deadlines due today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Assigned Queue */}
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <div>
              <h3>Recent Assigned Queue</h3>
            </div>
            <Link href="/tech-jobs" className="btn small">View All ({counts.activeJobs || 0})</Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Device & Fault</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <ProgressLoader tableRow colSpan={4} compact message="Please wait while assigned queue is loading..." />
                  ) : recentJobs.length > 0 ? (
                    recentJobs.map(job => (
                      <tr key={job.id}>
                        <td><strong>{job.tracking_id}</strong></td>
                        <td>
                          <div>{[job.brand, job.model].filter(Boolean).join(' ') || 'Device'}</div>
                          <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{job.problem}</div>
                        </td>
                        <td><span className="badge">{job.status}</span></td>
                        <td>
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            Work
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                        No assigned repair jobs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <TechJobModal
        isOpen={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
        jobId={selectedJobId}
        onSuccess={() => loadDashboard()}
      />
    </>
  );
}
