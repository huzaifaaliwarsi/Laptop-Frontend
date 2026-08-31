'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const { user, role, logout, companyBranding } = useAuth();

  const brandMarkup = companyBranding?.logo_data ? (
    <img src={companyBranding.logo_data} alt="Logo" className="w-full h-full object-contain" />
  ) : (
    <span className="text-base font-black text-white tracking-wider">{getInitials(companyBranding?.company_name)}</span>
  );

  const navItems = [
    // Technician Navigation
    { href: '/technician', icon: 'dashboard', label: 'Dashboard', roles: ['technician'] },
    { href: '/tech-jobs', icon: 'clipboard', label: 'My Jobs', roles: ['technician'] },
    { href: '/tech-completed', icon: 'checkCircle', label: 'Completed Jobs', roles: ['technician'] },

    // Admin & Sales Navigation
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ['admin', 'sales'] },
    { href: '/pos', icon: 'cart', label: 'POS & Invoices', roles: ['admin', 'sales'] },
    { href: '/repairs', icon: 'wrench', label: 'Repair Management', roles: ['admin', 'sales'] },
    { href: '/sales-purchases', icon: 'receipt', label: 'Sales & Purchases', roles: ['admin', 'sales'] },
    { href: '/inventory', icon: 'boxes', label: 'Inventory', roles: ['admin', 'sales'] },
    { href: '/vendors', icon: 'truck', label: 'Vendors', roles: ['admin'] },
    { href: '/customers', icon: 'users', label: 'Customers', roles: ['admin', 'sales'] },
    { href: '/whatsapp', icon: 'message', label: 'WhatsApp CRM', roles: ['admin', 'sales'] },
    { href: '/accounts', icon: 'wallet', label: 'Accounts', roles: ['admin', 'sales'] },
    { href: '/ledger', icon: 'book', label: 'Ledger', roles: ['admin', 'sales'] },
    { href: '/expenses', icon: 'banknote', label: 'Expense Management', roles: ['admin', 'sales', 'technician'] },
    { href: '/reports', icon: 'chart', label: role === 'technician' ? 'My Reports' : 'Reports', roles: ['admin', 'sales', 'technician'] },
    { href: '/staff', icon: 'userCog', label: 'Staff Management', roles: ['admin'] },
    { href: '/settings', icon: 'settings', label: 'Settings', roles: ['admin'] },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(role));

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
              {companyBranding?.company_name || 'iSysware'}
            </h1>
            <p className="brand-subtitle">
              {companyBranding?.tagline || 'Retail & Repair Management'}
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

        {/* Navigation Links */}
        <div className="nav-label">
          Workspace
        </div>
        <nav className="nav">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
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
              {role === 'admin' ? 'Admin Portal' : role === 'sales' ? 'Sales Staff Portal' : 'Technician Portal'}
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
