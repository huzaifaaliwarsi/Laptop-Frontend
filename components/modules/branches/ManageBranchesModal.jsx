'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  PlusCircle, 
  Radio, 
  ArrowRight,
  Server,
  Lock,
  RefreshCw
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../common/Toast';

export default function ManageBranchesModal({ isOpen, onClose }) {
  const { activeBranch, branches, switchBranch, loadBranches, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testSuccess, setTestSuccess] = useState(null);
  const [creatingBranch, setCreatingBranch] = useState(false);

  // Form State for Branch 2
  const [useConnString, setUseConnString] = useState(true);
  const [branchName, setBranchName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbSsl, setDbSsl] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setTestSuccess(null);
      setShowAddForm(false);
    }
  }, [isOpen, loadBranches]);

  if (!isOpen) return null;

  const totalBranches = branches.length;
  const isMaxReached = totalBranches >= 2;

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestSuccess(null);
    try {
      const payload = useConnString
        ? { connectionString, ssl: dbSsl }
        : { db_host: dbHost, db_port: dbPort, db_name: dbName, db_user: dbUser, db_password: dbPassword, ssl: dbSsl };

      const res = await api.post('/branches/test-connection', payload);
      if (res.success) {
        setTestSuccess({
          ok: true,
          message: `Connected to database "${res.data?.database}" successfully!`
        });
        toast('Database connection verified successfully!');
      } else {
        setTestSuccess({
          ok: false,
          message: res.message || 'Connection failed.'
        });
        toast(res.message || 'Connection test failed', 'error');
      }
    } catch (err) {
      setTestSuccess({
        ok: false,
        message: err.message || 'Connection failed.'
      });
      toast(err.message || 'Connection failed', 'error');
    } finally {
      setTestingConn(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (isMaxReached) {
      toast('Maximum branch limit reached. Only 2 branches are allowed.', 'error');
      return;
    }

    if (!branchName) {
      toast('Please enter a branch name.', 'error');
      return;
    }

    setCreatingBranch(true);
    try {
      const payload = {
        branch_name: branchName,
        phone,
        address,
        db_ssl: dbSsl,
        ...(useConnString
          ? { connectionString }
          : { db_host: dbHost, db_port: dbPort, db_name: dbName, db_user: dbUser, db_password: dbPassword })
      };

      const res = await api.post('/branches', payload);
      if (res.success) {
        toast('Branch 2 created and database provisioned successfully!');
        await loadBranches();
        setShowAddForm(false);
        setTestSuccess(null);
      } else {
        toast(res.message || 'Failed to create branch.', 'error');
      }
    } catch (err) {
      toast(err.message || 'Failed to create branch.', 'error');
    } finally {
      setCreatingBranch(false);
    }
  };

  return (
    <div className="modal-backdrop open">
      <div className="modal-card" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#2563eb', color: '#fff', padding: 8, borderRadius: 8, display: 'flex' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Branch Architecture & Registry</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                2-Branch Separate-Database Isolation System
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Architecture Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: isMaxReached ? '#f0fdf4' : '#eff6ff',
            border: `1px solid ${isMaxReached ? '#bbf7d0' : '#bfdbfe'}`,
            borderRadius: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color={isMaxReached ? '#16a34a' : '#2563eb'} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isMaxReached ? '#166534' : '#1e40af' }}>
                {isMaxReached ? 'Maximum Limit Reached (2 / 2 Branches Active)' : `Registered Branches: ${totalBranches} / 2 Allowed`}
              </span>
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 20,
              background: isMaxReached ? '#16a34a' : '#2563eb',
              color: '#fff'
            }}>
              Max: 2 Branches
            </span>
          </div>

          {/* Registered Branches List */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
              Current Branches
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {branches.map((b) => {
                const isActive = activeBranch?.id === b.id;
                return (
                  <div
                    key={b.id}
                    style={{
                      border: `1.5px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
                      background: isActive ? '#f8faff' : '#ffffff',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        background: isActive ? '#2563eb' : '#f1f5f9',
                        color: isActive ? '#fff' : '#64748b',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: 13
                      }}>
                        {b.branch_code}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 14, color: '#1e293b' }}>{b.branch_name}</strong>
                          {isActive && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4 }}>
                              CURRENT ACTIVE
                            </span>
                          )}
                          <span style={{ fontSize: 10, fontWeight: 600, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 4 }}>
                            {b.status || 'Active'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 11.5, color: '#64748b' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Database size={12} /> DB: <strong>{b.db_name}</strong>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Server size={12} /> Host: {b.db_host}
                          </span>
                          {b.phone && <span>📞 {b.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isActive ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                          <CheckCircle2 size={16} /> In Session
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn primary"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                          onClick={() => switchBranch(b.id)}
                        >
                          Switch Branch <ArrowRight size={13} style={{ marginLeft: 4 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Branch 2 Section */}
          {!isMaxReached ? (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              {!showAddForm ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={() => setShowAddForm(true)}
                >
                  <PlusCircle size={16} />
                  <span>+ Register Branch 2 (New Database)</span>
                </button>
              ) : (
                <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#1e293b' }}>Register Branch 2 Operational Database</strong>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="field-label required">Branch Name</label>
                      <input
                        className="input"
                        placeholder="e.g. DHA Phase 5 Branch"
                        value={branchName}
                        onChange={e => setBranchName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="field-label">Branch Phone</label>
                      <input
                        className="input"
                        placeholder="0300-1234567"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Branch Address</label>
                    <input
                      className="input"
                      placeholder="Shop #12, Commercial Plaza..."
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>

                  {/* Mode switch */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 4 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={useConnString}
                        onChange={() => setUseConnString(true)}
                      />
                      <span>PostgreSQL Connection URL (e.g. Neon/Supabase/AWS)</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={!useConnString}
                        onChange={() => setUseConnString(false)}
                      />
                      <span>Individual Parameters (Host, Port, DB, User)</span>
                    </label>
                  </div>

                  {useConnString ? (
                    <div>
                      <label className="field-label required">PostgreSQL Connection String</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="postgresql://user:password@host/dbname?sslmode=require"
                        value={connectionString}
                        onChange={e => setConnectionString(e.target.value)}
                        required
                      />
                      <small style={{ fontSize: 10.5, color: '#64748b', display: 'block', marginTop: 3 }}>
                        Encrypted at rest with AES-256 in Master DB. Never exposed to clients.
                      </small>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 10 }}>
                      <div>
                        <label className="field-label required">Host</label>
                        <input
                          className="input"
                          placeholder="127.0.0.1"
                          value={dbHost}
                          onChange={e => setDbHost(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label required">Port</label>
                        <input
                          className="input"
                          placeholder="5432"
                          value={dbPort}
                          onChange={e => setDbPort(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label required">Database Name</label>
                        <input
                          className="input"
                          placeholder="retail_repair_branch2"
                          value={dbName}
                          onChange={e => setDbName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label required">User</label>
                        <input
                          className="input"
                          placeholder="postgres"
                          value={dbUser}
                          onChange={e => setDbUser(e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="field-label required">Password</label>
                        <input
                          className="input"
                          type="password"
                          placeholder="••••••••"
                          value={dbPassword}
                          onChange={e => setDbPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <input
                      type="checkbox"
                      id="dbSsl"
                      checked={dbSsl}
                      onChange={e => setDbSsl(e.target.checked)}
                    />
                    <label htmlFor="dbSsl" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                      Enable SSL (Required for Cloud Neon / Supabase / AWS RDS)
                    </label>
                  </div>

                  {/* Test result feedback */}
                  {testSuccess && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: testSuccess.ok ? '#dcfce7' : '#fee2e2',
                      color: testSuccess.ok ? '#166534' : '#991b1b',
                      border: `1px solid ${testSuccess.ok ? '#86efac' : '#fca5a5'}`
                    }}>
                      {testSuccess.ok ? '✓ ' : '✕ '} {testSuccess.message}
                    </div>
                  )}

                  {/* Form Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={handleTestConnection}
                      disabled={testingConn || creatingBranch}
                    >
                      {testingConn ? (
                        <>
                          <div className="loader loader-xs"></div>
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={13} />
                          <span>Test DB Connection</span>
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      className="btn primary"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      disabled={creatingBranch || testingConn}
                    >
                      {creatingBranch ? (
                        <>
                          <div className="loader loader-xs"></div>
                          <span>Provisioning Branch 2...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Create Branch 2 & Initialize DB</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Max Limit Notice */
            <div style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: 10,
              padding: '16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6
            }}>
              <Lock size={20} color="#64748b" />
              <strong style={{ fontSize: 13, color: '#334155' }}>
                Maximum Branch Limit Reached (2 / 2)
              </strong>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', maxWidth: 460 }}>
                This system architecture strictly permits a maximum of 2 operational branch databases. 
                Both Branch 1 and Branch 2 are currently active.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="modal-foot" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
