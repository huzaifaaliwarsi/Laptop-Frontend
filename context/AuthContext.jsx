'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useToast } from '../components/common/Toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null); // null = not resolved yet
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyBranding, setCompanyBranding] = useState({
    company_name: 'Saad Communication',
    tagline: 'Retail & Repair Management System',
    invoice_subtitle: 'Retail • Inventory • Repair',
    phone: '',
    email: '',
    tax_number: '',
    address: '',
    invoice_footer: 'Thank you for choosing us. We appreciate your business.',
    logo_data: null
  });

  // Use refs for values needed inside callbacks to avoid stale closures
  const userRef = useRef(null);
  const branchesRef = useRef([]);

  const { toast } = useToast();

  const loadCompanyBranding = useCallback(async (forBranchId = null) => {
    try {
      const targetBranchId = forBranchId ||
        (typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1');
      // api.get(endpoint, headers, options) — 2nd arg is headers directly
      const res = await api.get(
        '/settings/company',
        { 'X-Branch-Id': String(targetBranchId) },
        { noCache: true }
      );
      if (res.success && res.data) {
        setCompanyBranding({ ...res.data, branchId: String(targetBranchId) });
      }
    } catch (err) {
      console.error('[Company Branding Load Error]:', err);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const res = await api.get('/branches');
      if (res.success && res.data) {
        setBranches(res.data);
        branchesRef.current = res.data;

        if (typeof window !== 'undefined') {
          const storedBId = localStorage.getItem('activeBranchId');
          if (storedBId) {
            const matched = res.data.find(b => String(b.id) === String(storedBId));
            if (matched) {
              setActiveBranch(matched);
              return matched;
            }
          }
          // Default to branch 1 if nothing stored
          const defaultBranch = res.data.find(b => b.id === 1) || res.data[0];
          if (defaultBranch) {
            setActiveBranch(defaultBranch);
            localStorage.setItem('activeBranchId', String(defaultBranch.id));
            return defaultBranch;
          }
        }
      }
    } catch (err) {
      console.error('[Load Branches Error]:', err);
    }
    return null;
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        userRef.current = res.data.user;
        if (res.data.branch) {
          setActiveBranch(res.data.branch);
          if (typeof window !== 'undefined') {
            localStorage.setItem('activeBranchId', String(res.data.branch.id));
          }
        }
        const socket = getSocket();
        if (socket) {
          socket.emit('join_portal', res.data.user.role);
          socket.emit('join_branch', {
            branchId: res.data.branch?.id || 1,
            role: res.data.user.role
          });
        }
      } else {
        setUser(null);
        userRef.current = null;
      }
    } catch (err) {
      setUser(null);
      userRef.current = null;
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: resolve stored branch, load branding, load branch list, check auth
  useEffect(() => {
    const storedBId = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
    checkAuth();
    loadBranches();
    loadCompanyBranding(storedBId);
  }, [checkAuth, loadCompanyBranding, loadBranches]);

  // Real-time socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleBrandingUpdated = (data) => {
      const activeBId = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
      if (!data.branchId || String(data.branchId) === String(activeBId)) {
        setCompanyBranding(data);
      }
    };

    const handleStaffStatus = (data) => {
      const currentUser = userRef.current;
      if (currentUser && currentUser.id === data.id && data.status === 'Inactive') {
        logout();
        toast('Your account has been deactivated.', 'error');
      }
    };

    socket.on('settings.company_updated', handleBrandingUpdated);
    socket.on('staff.status_changed', handleStaffStatus);

    return () => {
      socket.off('settings.company_updated', handleBrandingUpdated);
      socket.off('staff.status_changed', handleStaffStatus);
    };
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * switchBranch — Super Admin only.
   * Sets localStorage, clears cache, updates state, navigates to /dashboard.
   * Uses refs to avoid stale closure on role/branches.
   */
  const switchBranch = useCallback(async (branchId) => {
    try {
      const currentUser = userRef.current;
      if (!currentUser || currentUser.role !== 'super_admin') {
        toast('Branch switching is restricted to Platform Super Admin.', 'error');
        return;
      }

      const numericId = parseInt(branchId, 10);
      if (isNaN(numericId) || numericId < 1) {
        toast('Invalid branch ID.', 'error');
        return;
      }

      if (typeof window !== 'undefined') {
        // 1. Commit the new activeBranchId to localStorage FIRST
        localStorage.setItem('activeBranchId', String(numericId));
        localStorage.setItem('portalView', 'admin');

        // 2. Clear old companyBranding immediately so it never bleeds into new branch
        setCompanyBranding(null);

        // 3. Nuke all client-side API cache to prevent cross-branch data bleed
        try {
          const mod = await import('../services/api');
          if (mod.clearClientCache) mod.clearClientCache();
        } catch (_) { /* ignore */ }

        // 4. Update React state immediately with known target branch
        const knownBranches = branchesRef.current;
        const b = knownBranches.find(item => item.id === numericId);
        if (b) {
          setActiveBranch(b);
        }

        // 5. Trigger fresh branding load for new branch
        loadCompanyBranding(numericId);

        toast(`Switching to ${b?.branch_name || 'Branch ' + numericId}...`);

        // 6. Hard navigate to /dashboard — fully remounts everything with new branch context
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 250);
      }
    } catch (err) {
      console.error('Error switching branch:', err);
      toast('Failed to switch branch. Please try again.', 'error');
    }
  }, [loadCompanyBranding, toast]);

  const login = async (username, password, portal) => {
    try {
      let res;
      if (portal === 'super_admin') {
        res = await api.post('/super-admin/login', { username, password });
      } else {
        res = await api.post('/auth/login', { username, password, portal });
      }

      if (res.success && res.data) {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        if (res.data.branch) {
          setActiveBranch(res.data.branch);
          localStorage.setItem('activeBranchId', String(res.data.branch.id));
        }
        setUser(res.data.user);
        userRef.current = res.data.user;
        const socket = getSocket();
        if (socket) {
          socket.emit('join_portal', res.data.user.role);
          socket.emit('join_branch', {
            branchId: res.data.branch?.id || 1,
            role: res.data.user.role
          });
        }
        toast(`Welcome, ${res.data.user.name || res.data.user.username}!`);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      toast(err.message || 'Invalid username or password', 'error');
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('activeBranchId');
      localStorage.removeItem('portalView');
      setUser(null);
      userRef.current = null;
      toast('Logged out successfully');
    }
  };

  const [activePortalView, setActivePortalView] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portalView') || 'super_admin';
    }
    return 'super_admin';
  });

  const switchPortalView = useCallback((targetView) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'super_admin') {
      return;
    }
    setActivePortalView(targetView);
    if (typeof window !== 'undefined') {
      localStorage.setItem('portalView', targetView);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || '',
        effectiveRole: user?.role === 'super_admin' ? activePortalView : (user?.role || ''),
        isSuperAdmin: user?.role === 'super_admin',
        activePortalView,
        switchPortalView,
        activeBranch,
        branches,
        switchBranch,
        loadBranches,
        isAuthenticated: !!user,
        loading,
        companyBranding,
        refreshBranding: loadCompanyBranding,
        updateBranding: setCompanyBranding,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
