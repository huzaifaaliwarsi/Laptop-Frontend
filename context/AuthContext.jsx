'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useToast } from '../components/common/Toast';

const AuthContext = createContext(null);

// Unified Per-Branch Branding Cache:
// All branding metadata AND logo_data are stored permanently in localStorage keyed by branch ID.
// This ensures that:
// 1. On first-ever load, once fetched, logos persist across all tabs, windows, and browser restarts.
// 2. On switching branches, the target branch's logo renders INSTANTLY with 0ms delay.
// 3. Fallback to sessionStorage if localStorage quota is ever exceeded.

const CACHE_PREFIX = 'branding_cache_';
const META_PREFIX  = 'branding_meta_';
const LOGO_PREFIX  = 'branding_logo_';
const LEGACY_KEY   = 'companyBranding_cache';

function readBrandingFromCache(branchId) {
  if (typeof window === 'undefined' || !branchId) return null;
  const id = String(branchId);

  // 1. Primary unified persistent localStorage cache
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...parsed, branchId: id };
      }
    }
  } catch (_) {}

  // 2. Mirror in sessionStorage
  try {
    const sessionStored = sessionStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (sessionStored) {
      const parsed = JSON.parse(sessionStored);
      if (parsed && typeof parsed === 'object') {
        try { localStorage.setItem(`${CACHE_PREFIX}${id}`, sessionStored); } catch (_) {}
        return { ...parsed, branchId: id };
      }
    }
  } catch (_) {}

  // 3. Backward-compatibility: migrate from separate meta + logo keys
  try {
    const metaRaw = localStorage.getItem(`${META_PREFIX}${id}`);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      const logo = sessionStorage.getItem(`${LOGO_PREFIX}${id}`) || localStorage.getItem(`${LOGO_PREFIX}${id}`) || null;
      const combined = { ...meta, logo_data: logo, branchId: id };
      saveBrandingToCache(id, combined);
      return combined;
    }
  } catch (_) {}

  // 4. Migration from legacy single-key cache
  try {
    const oldRaw = localStorage.getItem(LEGACY_KEY);
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      const migrated = { ...old, branchId: id };
      saveBrandingToCache(id, migrated);
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch (_) {}

  return null;
}

function saveBrandingToCache(branchId, data) {
  if (typeof window === 'undefined' || !branchId || !data) return;
  const id = String(branchId);
  const payload = { ...data, branchId: id };
  const serialized = JSON.stringify(payload);

  // 1. Primary write to persistent localStorage
  try {
    localStorage.setItem(`${CACHE_PREFIX}${id}`, serialized);
    // Also mirror to sessionStorage
    try { sessionStorage.setItem(`${CACHE_PREFIX}${id}`, serialized); } catch (_) {}
    return;
  } catch (err) {
    console.warn(`[BrandingCache] localStorage write failed for branch ${id}:`, err?.message);
  }

  // 2. Clean old/legacy entries if quota was hit, then retry
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('branding_meta_') || key.startsWith('branding_logo_')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(`${CACHE_PREFIX}${id}`, serialized);
    return;
  } catch (_) {}

  // 3. Fallback to sessionStorage if localStorage is completely blocked
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${id}`, serialized);
  } catch (_) {}
}

const DEFAULT_BRANDING = {
  company_name: 'Saad Communication',
  tagline: 'Retail & Repair Management System',
  invoice_subtitle: 'Retail - Inventory - Repair',
  phone: '',
  email: '',
  tax_number: '',
  address: '',
  invoice_footer: 'Thank you for choosing us. We appreciate your business.',
  logo_data: null,
  branchId: '1'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
          const parsed = JSON.parse(storedUser);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (_) {}
    }
    return null;
  });
  const [activeBranch, setActiveBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (storedUser && token) return false;
    }
    return true;
  });
  const [companyBranding, setCompanyBranding] = useState(() => {
    const storedBId = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
    const cached = readBrandingFromCache(storedBId);
    if (cached) return cached;
    return { ...DEFAULT_BRANDING, branchId: storedBId };
  });

  const userRef = useRef(user);
  const branchesRef = useRef([]);
  const { toast } = useToast();

  const loadCompanyBranding = useCallback(async (forBranchId = null) => {
    try {
      const targetBranchId = String(
        forBranchId || (typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1')
      );
      const res = await api.get(
        '/settings/company',
        { 'X-Branch-Id': targetBranchId }
      );
      if (res.success && res.data) {
        const fresh = { ...res.data, branchId: targetBranchId };
        saveBrandingToCache(targetBranchId, fresh);
        const currentActive = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
        if (String(currentActive) === targetBranchId) {
          setCompanyBranding(fresh);
        }
        return fresh;
      }
    } catch (err) {
      console.error('[Company Branding Load Error]:', err);
    }
    return null;
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const res = await api.get('/branches');
      if (res.success && res.data) {
        setBranches(res.data);
        branchesRef.current = res.data;

        // Pre-fetch and cache branding for ALL branches in background
        // Guarantees immediate zero-flash logo display for all branches
        res.data.forEach(b => {
          if (b?.id) {
            loadCompanyBranding(String(b.id));
          }
        });

        if (typeof window !== 'undefined') {
          const storedBId = localStorage.getItem('activeBranchId');
          if (storedBId) {
            const matched = res.data.find(b => String(b.id) === String(storedBId));
            if (matched) { setActiveBranch(matched); return matched; }
          }
          const defaultBranch = res.data.find(b => b.id === 1) || res.data[0];
          if (defaultBranch) {
            setActiveBranch(defaultBranch);
            localStorage.setItem('activeBranchId', String(defaultBranch.id));
            return defaultBranch;
          }
        }
      }
    } catch (err) { console.error('[Load Branches Error]:', err); }
    return null;
  }, [loadCompanyBranding]);

  const checkAuth = useCallback(async (onBranchResolved = null) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setUser(null);
      userRef.current = null;
      if (typeof window !== 'undefined') localStorage.removeItem('user');
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        userRef.current = res.data.user;
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('user', JSON.stringify(res.data.user)); } catch (_) {}
        }
        if (res.data.branch) {
          setActiveBranch(res.data.branch);
          const resolvedBranchId = String(res.data.branch.id);
          if (typeof window !== 'undefined') localStorage.setItem('activeBranchId', resolvedBranchId);
          if (onBranchResolved) onBranchResolved(resolvedBranchId);
        }
        const socket = getSocket();
        if (socket) {
          socket.emit('join_portal', res.data.user.role);
          socket.emit('join_branch', { branchId: res.data.branch?.id || 1, role: res.data.user.role });
        }
      } else if (res.success === false && (res.code === 'UNAUTHORIZED' || res.code === 'TOKEN_EXPIRED' || res.code === 'USER_INACTIVE' || res.code === 'NO_TOKEN')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setUser(null);
        userRef.current = null;
      }
    } catch (err) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_EXPIRED' || err.code === 'USER_INACTIVE') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setUser(null);
        userRef.current = null;
      } else {
        console.warn('[Auth] Server check failed; keeping persistent user session:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedBId = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
    loadCompanyBranding(storedBId);
    checkAuth((resolvedBranchId) => {
      if (resolvedBranchId && resolvedBranchId !== String(storedBId)) {
        const correctCache = readBrandingFromCache(resolvedBranchId);
        if (correctCache) setCompanyBranding(correctCache);
        loadCompanyBranding(resolvedBranchId);
      }
    });
    loadBranches();
  }, [checkAuth, loadCompanyBranding, loadBranches]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleBrandingUpdated = (data) => {
      const activeBId = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
      const targetBId = String(data.branchId || activeBId);
      saveBrandingToCache(targetBId, data);
      if (String(activeBId) === targetBId) {
        setCompanyBranding({ ...data, branchId: targetBId });
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

  const switchBranch = useCallback(async (branchId) => {
    try {
      const currentUser = userRef.current;
      if (!currentUser || currentUser.role !== 'super_admin') {
        toast('Branch switching is restricted to Platform Super Admin.', 'error');
        return;
      }
      const numericId = parseInt(branchId, 10);
      if (isNaN(numericId) || numericId < 1) { toast('Invalid branch ID.', 'error'); return; }
      if (typeof window !== 'undefined') {
        const idStr = String(numericId);
        localStorage.setItem('activeBranchId', idStr);
        localStorage.setItem('portalView', 'admin');

        // Immediately update state with target branch branding from persistent cache
        const cachedBranding = readBrandingFromCache(idStr);
        if (cachedBranding) {
          setCompanyBranding(cachedBranding);
        }

        try {
          const mod = await import('../services/api');
          if (mod.clearClientCache) mod.clearClientCache();
        } catch (_) { }

        const knownBranches = branchesRef.current;
        const b = knownBranches.find(item => item.id === numericId);
        if (b) setActiveBranch(b);

        toast(`Switching to ${b?.branch_name || 'Branch ' + numericId}...`);

        // Wait for branding fetch to complete & save to cache before navigating (capped at 400ms)
        await Promise.race([
          loadCompanyBranding(idStr),
          new Promise(r => setTimeout(r, 400))
        ]);

        const userRole = userRef.current?.role;
        window.location.href = userRole === 'technician' ? '/technician' : '/dashboard';
      }
    } catch (err) {
      console.error('Error switching branch:', err);
      toast('Failed to switch branch. Please try again.', 'error');
    }
  }, [loadCompanyBranding, toast]);

  const updateBranding = useCallback((updater) => {
    setCompanyBranding(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const bId = next?.branchId || prev?.branchId || (typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1');
      const enriched = { ...next, branchId: String(bId) };
      saveBrandingToCache(bId, enriched);
      return enriched;
    });
  }, []);

  const login = async (username, password, portal) => {
    try {
      let res;
      if (portal === 'super_admin') {
        res = await api.post('/super-admin/login', { username, password });
      } else {
        res = await api.post('/auth/login', { username, password, portal });
      }
      if (res.success && res.data) {
        if (res.data.token) localStorage.setItem('token', res.data.token);
        if (res.data.user) {
          try { localStorage.setItem('user', JSON.stringify(res.data.user)); } catch (_) {}
        }
        if (res.data.branch) {
          setActiveBranch(res.data.branch);
          localStorage.setItem('activeBranchId', String(res.data.branch.id));
          loadCompanyBranding(String(res.data.branch.id));
        }
        setUser(res.data.user);
        userRef.current = res.data.user;
        const socket = getSocket();
        if (socket) {
          socket.emit('join_portal', res.data.user.role);
          socket.emit('join_branch', { branchId: res.data.branch?.id || 1, role: res.data.user.role });
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
    try { await api.post('/auth/logout'); } catch (err) { console.error(err); } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranchId');
      localStorage.removeItem('portalView');
      setUser(null);
      userRef.current = null;
      toast('Logged out successfully');
    }
  };

  const [activePortalView, setActivePortalView] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('portalView') || 'super_admin';
    return 'super_admin';
  });

  const switchPortalView = useCallback((targetView) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'super_admin') return;
    setActivePortalView(targetView);
    if (typeof window !== 'undefined') localStorage.setItem('portalView', targetView);
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
        updateBranding,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
