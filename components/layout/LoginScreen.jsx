'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import api from '../../services/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Retail & Repair Management');
  const [tagline, setTagline] = useState('POS, Inventory Management, Sales & Purchases');


  useEffect(() => {
    api.get('/settings/company')
      .then(res => {
        if (res.success && res.data) {
          if (res.data.company_name) setCompanyName(res.data.company_name);
          if (res.data.tagline) setTagline(res.data.tagline);
        }
      })
      .catch(() => { });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        toast(res.message || 'Login failed', 'error');
      }
    } catch (err) {
      toast(err.message || 'Login error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="login-split-wrapper">
      {/* Left Gradient Panel */}
      <div className="login-left-panel">
        {/* Decorative circles */}
        <div className="login-decor-circle login-decor-circle-1" />
        <div className="login-decor-circle login-decor-circle-2" />
        <div className="login-decor-circle login-decor-circle-3" />

        <div className="login-left-content">
          {/* Brand icon */}
          <div className="login-brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L12 22" />
              <path d="M2 12L22 12" />
              <path d="M4.93 4.93L19.07 19.07" />
              <path d="M19.07 4.93L4.93 19.07" />
            </svg>
          </div>

          <h1 className="login-hero-title">
            Hello<br />
            <span className="login-hero-company">{companyName}</span>
            <span className="login-hero-wave"> </span>
          </h1>

          <p className="login-hero-desc">
            {tagline}. Manage your business operations efficiently with our complete management system.
          </p>

          {/* Module pills */}
          <div className="login-modules">
            <span className="login-module-pill">POS & Sales</span>
            <span className="login-module-pill">Repair Workshop</span>
            <span className="login-module-pill">Inventory</span>
            <span className="login-module-pill">Accounts & Ledger</span>
            <span className="login-module-pill">Vendor Management</span>
            <span className="login-module-pill">WhatsApp CRM</span>
          </div>
        </div>

        <div className="login-left-footer">
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-right-panel">
        <div className="login-right-inner">
          {/* Top company name */}
          <div className="login-right-brand">{companyName}</div>

          <div className="login-form-area">
            <h2 className="login-welcome-title">Welcome Back!</h2>
            <p className="login-welcome-sub">Sign in to access your designated operational portal.</p>

            {/* Role Quick Fills — compact horizontal row at top */}
            <div className="login-roles-section-top">
              <div className="login-roles-label">Quick Access</div>
              <div className="login-roles-row">
                <button
                  type="button"
                  className="login-role-chip"
                  onClick={() => handleQuickFill('admin', 'admin')}
                >
                  <span className="login-chip-dot admin" />
                  Admin
                </button>
                <button
                  type="button"
                  className="login-role-chip"
                  onClick={() => handleQuickFill('sales', 'sales123')}
                >
                  <span className="login-chip-dot sales" />
                  Sales
                </button>
                <button
                  type="button"
                  className="login-role-chip"
                  onClick={() => handleQuickFill('tech', 'tech123')}
                >
                  <span className="login-chip-dot tech" />
                  Technician
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label className="login-label">Username</label>
                <input
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, sales, tech"
                  required
                  id="loginUsername"
                />
              </div>

              <div className="login-field">
                <label className="login-label">Password</label>
                <input
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  id="loginPassword"
                />
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
                id="loginSubmitBtn"
              >
                {loading ? 'Authenticating...' : 'Login Now'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
