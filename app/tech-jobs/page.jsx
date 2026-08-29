'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import TechJobModal from '../../components/modules/repairs/TechJobModal';
import { TableRowSkeleton } from '../../components/common/Skeleton';

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function TechJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const loadJobs = () => {
    setLoading(true);
    let url = '/repairs?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

    api.get(url)
      .then(res => {
        if (res.success) {
          // Filter out delivered
          const list = (res.data || []).filter(j => j.status !== 'Delivered & Closed');
          setJobs(list);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, [search, statusFilter]);

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input
                className="input search"
                style={{ maxWidth: 320 }}
                placeholder="Search tracking ID, customer, device..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                style={{ width: 200 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Active Statuses</option>
                <option value="Job Received">Job Received</option>
                <option value="Diagnosis in Progress">Diagnosis in Progress</option>
                <option value="Waiting for Customer Approval">Waiting for Customer Approval</option>
                <option value="Repair Approved">Repair Approved</option>
                <option value="Work in Progress">Work in Progress</option>
                <option value="Waiting for Parts">Waiting for Parts</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
              </select>
            </div>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Category</th>
                  <th>Customer</th>
                  <th>Device / Problem</th>
                  <th>Job Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Expected Completion</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowSkeleton cols={10} rows={6} />
                ) : jobs.length > 0 ? (
                  jobs.map((j) => (
                    <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedJobId(j.id)}>
                      <td><strong>{j.trackingId}</strong></td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'var(--blue-50, #eff6ff)',
                          color: 'var(--primary, #2563eb)',
                          border: '1px solid var(--border)'
                        }}>
                          {j.categoryName || j.productType || 'Standard'}
                        </span>
                      </td>
                      <td>
                        <strong>{j.customerName}</strong>
                        <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{j.contact}</div>
                      </td>
                      <td>
                        <div>{[j.brand, j.model].filter(Boolean).join(' ') || j.categoryName || 'Device'}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{j.problem}</div>
                      </td>
                      <td><span style={{ fontSize: 10, fontWeight: 700 }}>{j.jobType}</span></td>
                      <td>
                        <span className={`badge ${j.priority === 'Urgent' ? 'danger' : 'warning'}`}>
                          {j.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          j.status === 'Ready for Delivery' ? 'success' :
                          j.status === 'Waiting for Customer Approval' ? 'warning' : 'info'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800 }}>{j.workProgress || 0}%</div>
                      </td>
                      <td>{fmtDate(j.expectedCompletion)}</td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn small primary"
                          onClick={() => setSelectedJobId(j.id)}
                        >
                          Workbench
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No active assigned jobs matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TechJobModal
        isOpen={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
        jobId={selectedJobId}
        onSuccess={() => loadJobs()}
      />
    </>
  );
}
