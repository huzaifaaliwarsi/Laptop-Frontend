'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useToast } from '../components/common/Toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyBranding, setCompanyBranding] = useState({
    company_name: 'Retail & Repair Management',
    tagline: 'POS, Inventory Management, Sales & Purchases',
    invoice_subtitle: 'Retail • Inventory • Repair',
    phone: '',
    email: '',
    tax_number: '',
    address: '',
    invoice_footer: 'Thank you for choosing us. We appreciate your business.',
    logo_data: null
  });

  const { toast } = useToast();

  const loadCompanyBranding = useCallback(async () => {
    try {
      const res = await api.get('/settings/company');
      if (res.success && res.data) {
        setCompanyBranding(res.data);
      }
    } catch (err) {
      console.error('[Company Branding Load Error]:', err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        const socket = getSocket();
        if (socket) {
          socket.emit('join_portal', res.data.user.role);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    loadCompanyBranding();
  }, [checkAuth, loadCompanyBranding]);

  // Real-time socket events for company branding & staff changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleBrandingUpdated = (data) => {
      setCompanyBranding(data);
      toast('Company branding updated');
    };

    const handleStaffStatus = (data) => {
      if (user && user.id === data.id && data.status === 'Inactive') {
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
  }, [user, toast]);

  const login = async (username, password, portal) => {
    try {
      const res = await api.post('/auth/login', { username, password, portal });
      if (res.success && res.data) {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        setUser(res.data.user);
        const socket = getSocket();
        if (socket) {
          socket.emit('join_portal', res.data.user.role);
        }
        toast(`Welcome, ${res.data.user.name}!`);
        return { success: true };
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
      setUser(null);
      toast('Logged out successfully');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || '',
        isAuthenticated: !!user,
        loading,
        companyBranding,
        refreshBranding: loadCompanyBranding,
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
