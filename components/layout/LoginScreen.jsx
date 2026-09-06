'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import api from '../../services/api';
import { useRouter } from 'next/navigation';

export default function LoginScreen() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const passwordInputRef = useRef(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Saad Communication');
  const [tagline, setTagline] = useState('Retail and Repair management system');

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
    if (!username.trim() || !password) {
      toast('Please enter both username and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const cleanUser = username.trim().toLowerCase();
      const portal = cleanUser === 'superadmin' ? 'super_admin' : undefined;
      const res = await login(cleanUser, password, portal);

      if (!res.success) {
        toast(res.message || 'Invalid username or password', 'error');
      } else {
        const userRole = res.user?.role || (cleanUser === 'superadmin' ? 'super_admin' : 'admin');
        if (userRole === 'super_admin' || cleanUser === 'superadmin') {
          router.push('/super-admin');
        } else if (userRole === 'technician') {
          router.push('/technician');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      toast(err.message || 'Login error occurred', 'error');
    } finally {
      setLoading(false);
    }
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

            <form onSubmit={handleSubmit} className="login-form" style={{ marginTop: '1.5rem' }}>
              <div className="login-field">
                <label className="login-label">Username</label>
                <input
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                  id="loginUsername"
                />
              </div>

              <div className="login-field">
                <label className="login-label">Password</label>
                <input
                  ref={passwordInputRef}
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
