'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import TechJobModal from '../../components/modules/repairs/TechJobModal';
import { TableRowSkeleton } from '../../components/common/Skeleton';

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function TechCompletedPage() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const loadJobs = () => {
    setLoading(true);
    let url = '/repairs?';
    if (search) url += `search=${encodeURIComponent(search)}&`;

    api.get(url)
      .then(res => {
        if (res.success) {
          // Completed jobs
          const list = (res.data || []).filter(j => ['Work Completed', 'Ready for Delivery', 'Delivered & Closed'].includes(j.status));
          setJobs(list);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, [search]);

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <input
              className="input search"
              style={{ maxWidth: 320 }}
              placeholder="Search completed jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Completed & QC Passed Repairs ({jobs.length})
            </span>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Customer</th>
                  <th>Device / Problem</th>
                  <th>Status</th>
                  <th>Final Remarks</th>
                  <th>Completion Date</th>
                  <th style={{ textAlign: 'center', width: 100 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowSkeleton cols={7} rows={5} />
                ) : jobs.length > 0 ? (
                  jobs.map((j) => (
                    <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedJobId(j.id)}>
                      <td><strong>{j.trackingId}</strong></td>
                      <td><strong>{j.customerName}</strong></td>
                      <td>{[j.brand, j.model].filter(Boolean).join(' ') || 'Device'}</td>
                      <td>
                        <span className={`badge ${j.status === 'Delivered & Closed' ? 'success' : 'info'}`}>
                          {j.status}
                        </span>
                      </td>
                      <td>{j.finalRemarks || 'Completed'}</td>
                      <td>{fmtDate(j.expectedCompletion || j.date)}</td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => setSelectedJobId(j.id)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      No completed repair jobs found.
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
