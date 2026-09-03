'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Icon from '../common/Icon';

function getInitials(name) {
  return String(name || 'RR')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase() || 'RR';
}

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, role, effectiveRole, activePortalView, switchPortalView, logout, companyBranding, activeBranch } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const isSuperAdminView = isSuperAdmin && (pathname.startsWith('/super-admin') || activePortalView === 'super_admin');
  
  // Only use companyBranding if it matches the current activeBranch id
  const isMatchingBranding = companyBranding && String(companyBranding.branchId || '') === String(activeBranch?.id || '');
  const rawBranchName = activeBranch?.branch_name || (isMatchingBranding ? companyBranding?.company_name : null) || 'Saad Communication';
  const cleanBranchName = rawBranchName.replace(/\s*\(Main Branch\)\s*/i, '').trim() || 'Saad Communication';
  const displayName = isSuperAdminView
    ? 'Central Platform'
    : cleanBranchName;

  const brandSubtitle = isSuperAdminView
    ? 'Master Operations & Multi-Branch'
    : (activeBranch?.branch_code ? `${activeBranch.branch_code} • POS & Workshop` : ((isMatchingBranding && companyBranding?.tagline) || 'Retail & Repair Management'));

  const brandMarkup = (isMatchingBranding && companyBranding?.logo_data) ? (
    <img src={companyBranding.logo_data} alt="Logo" className="w-full h-full object-contain" />
  ) : (
    <span className="text-base font-black text-white tracking-wider">{getInitials(displayName)}</span>
  );

  const superAdminNav = [
    { href: '/super-admin', icon: 'dashboard', label: 'Branch Summary', tab: 'overview' },
    { href: '/super-admin?tab=branches', icon: 'boxes', label: 'Branch List', tab: 'branches' },
    { href: '/super-admin/branches/new', icon: 'plus', label: 'Open New Branch', tab: 'new' },
    { href: '/super-admin?tab=reports', icon: 'chart', label: 'Branch Reports', tab: 'reports' },
    { href: '/super-admin?tab=audit_security', icon: 'shield', label: 'Audit & Security', tab: 'audit_security' },
  ];

  const branchAdminNav = [
    { href: '/dashboard', icon: 'dashboard', label: 'Branch Dashboard' },
    { href: '/pos', icon: 'cart', label: 'POS & Invoices' },
    { href: '/repairs', icon: 'wrench', label: 'Repair Management' },
    { href: '/sales-purchases', icon: 'receipt', label: 'Sales & Purchases' },
    { href: '/inventory', icon: 'boxes', label: 'Inventory' },
    { href: '/vendors', icon: 'truck', label: 'Vendors' },
    { href: '/customers', icon: 'users', label: 'Customers' },
    { href: '/whatsapp', icon: 'message', label: 'WhatsApp CRM' },
    { href: '/accounts', icon: 'wallet', label: 'Accounts' },
    { href: '/ledger', icon: 'book', label: 'Ledger' },
    { href: '/expenses', icon: 'banknote', label: 'Expense Management' },
    { href: '/reports', icon: 'chart', label: 'Reports' },
    { href: '/staff', icon: 'userCog', label: 'Staff Management' },
    { href: '/settings', icon: 'settings', label: 'Settings' },
  ];

  const salesNav = [
    { href: '/dashboard', icon: 'dashboard', label: 'Counter Dashboard' },
    { href: '/pos', icon: 'cart', label: 'POS & Invoices' },
    { href: '/repairs', icon: 'wrench', label: 'Repair Intake' },
    { href: '/sales-purchases', icon: 'receipt', label: 'Sales Orders' },
    { href: '/inventory', icon: 'boxes', label: 'Stock View' },
    { href: '/customers', icon: 'users', label: 'Customers' },
    { href: '/whatsapp', icon: 'message', label: 'WhatsApp' },
    { href: '/expenses', icon: 'banknote', label: 'Counter Expenses' },
    { href: '/reports', icon: 'chart', label: 'Sales Reports' },
  ];

  const techNav = [
    { href: '/technician', icon: 'dashboard', label: 'Technician Dashboard' },
    { href: '/tech-jobs', icon: 'clipboard', label: 'My Repair Jobs' },
    { href: '/tech-completed', icon: 'checkCircle', label: 'Completed Jobs' },
    { href: '/expenses', icon: 'banknote', label: 'Workshop Expenses' },
    { href: '/reports', icon: 'chart', label: 'My Reports' },
  ];

  let visibleNav = [];
  if (isSuperAdmin) {
    if (pathname.startsWith('/super-admin') || activePortalView === 'super_admin') {
      visibleNav = superAdminNav;
    } else if (activePortalView === 'sales') {
      visibleNav = salesNav;
    } else if (activePortalView === 'technician') {
      visibleNav = techNav;
    } else {
      visibleNav = branchAdminNav;
    }
  } else if (role === 'admin') {
    visibleNav = branchAdminNav;
  } else if (role === 'sales') {
    visibleNav = salesNav;
  } else if (role === 'technician') {
    visibleNav = techNav;
  } else {
    visibleNav = [];
  }

  const currentTab = searchParams ? (searchParams.get('tab') || 'overview') : 'overview';

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      id="sidebar"
    >
      <div>
        {/* Brand Header */}
        <div className="brand">
          <div className="brand-mark">
            {brandMarkup}
          </div>
          <div className="brand-info">
            <h1 className="brand-title">
              {displayName}
            </h1>
            <p className="brand-subtitle">
              {brandSubtitle}
            </p>
          </div>
          {/* Close button inside mobile drawer */}
          <button
            type="button"
            className="lg:hidden p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-auto"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section Label */}
        <div className="nav-label">
          MENU
        </div>

        {/* Nav Links */}
        <nav className="nav">
          {visibleNav.map((item) => {
            let isActive = false;
            if (isSuperAdmin && (pathname.startsWith('/super-admin') || activePortalView === 'super_admin')) {
              if (pathname === '/super-admin/branches/new') {
                isActive = item.href === '/super-admin/branches/new';
              } else if (pathname === '/super-admin') {
                isActive = item.tab === currentTab;
              }
            } else {
              isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <span className="nav-icon">
                  <Icon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-foot">
        <div className="sync-note">
          <span className="sync-dot"></span>
          <span>PostgreSQL Realtime Live</span>
        </div>

        <div className="user-strip">
          <div className="user-avatar">
            {getInitials(user?.name)}
          </div>
          <div className="user-meta">
            <strong id="sideUserName">
              {user?.name || 'User'}
            </strong>
            <span id="sideUserRole">
              {role === 'super_admin' ? 'Platform Super Admin' : role === 'admin' ? 'Branch Admin' : role === 'sales' ? 'Sales Staff Portal' : 'Technician Portal'}
            </span>
          </div>
          <button
            className="logout-btn"
            onClick={logout}
            id="logoutBtn"
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
