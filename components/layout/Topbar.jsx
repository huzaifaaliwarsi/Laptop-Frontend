'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

const meta = {
  '/dashboard': ['Dashboard', 'Business overview and quick actions'],
  '/pos': ['POS & Invoices', 'Product checkout, purchases, exchanges and held bills'],
  '/sales-purchases': ['Sales & Purchases', 'Central completed invoice records'],
  '/inventory': ['Inventory Management', 'Products, stock actions and movement history'],
  '/vendors': ['Vendors', 'Vendor profiles and returns'],
  '/customers': ['Customers', 'Customer profiles'],
  '/accounts': ['Accounts', 'Outstanding receivables and payables'],
  '/ledger': ['Ledger', 'Complete party-wise transaction history'],
  '/expenses': ['Expense Management', 'Cash and online operating expenses'],
  '/reports': ['Reports', 'Sales, cash, COGS, profit/loss and staff analytics'],
  '/staff': ['Staff Management', 'Users, roles and portal access'],
  '/technician': ['Technician Dashboard', 'Assigned workload, deadlines and technical activity'],
  '/tech-jobs': ['My Repair Jobs', 'Client-wise assigned repair queue'],
  '/tech-completed': ['Completed Jobs', 'Quality checked and completed repair history'],
  '/repairs': ['Repair Management', 'Jobs, diagnosis, tracking, billing and delivery'],
  '/whatsapp': ['WhatsApp CRM', 'Bot inbox, tracking, quotations and handoff'],
  '/settings': ['Settings', 'Categories, WhatsApp and prototype data']
};

export default function Topbar({ onToggleMenu }) {
  const pathname = usePathname();
  const { role } = useAuth();

  let title = 'Dashboard';
  let subtitle = 'Business overview and quick actions';

  if (meta[pathname]) {
    title = meta[pathname][0];
    subtitle = meta[pathname][1];
  } else {
    for (const key of Object.keys(meta)) {
      if (key !== '/dashboard' && pathname.startsWith(key)) {
        title = meta[key][0];
        subtitle = meta[key][1];
        break;
      }
    }
  }

  if (pathname === '/reports') {
    if (role === 'technician') {
      title = 'My Reports';
      subtitle = 'Assigned jobs, parts used and personal expenses';
    } else if (role === 'sales') {
      title = 'My Reports';
      subtitle = 'Employee-wise sales, repair, collection and outstanding activity';
    }
  }

  return (
    <header className="topbar h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs flex items-center justify-between px-5 sticky top-0 z-10">
      <div className="topbar-left flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="menu-btn lg:hidden border border-slate-200 bg-white rounded-lg w-9 h-9 grid place-items-center text-slate-600 hover:bg-slate-50 cursor-pointer"
          onClick={onToggleMenu}
          id="menuBtn"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="page-heading min-w-0">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-none truncate" id="pageTitle">
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 truncate" id="pageSubtitle">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}
