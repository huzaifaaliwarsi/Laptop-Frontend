'use client';

import React from 'react';
import { Menu, Building2, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
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
  '/settings': ['Settings', 'Categories, WhatsApp and prototype data'],
  '/super-admin': ['Platform Super Admin Control Center', 'Cross-branch BI, physical databases and platform administration']
};

export default function Topbar({ onToggleMenu }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, effectiveRole, activeBranch, switchPortalView } = useAuth();
  const currentRole = effectiveRole || role;
  const isSuperAdmin = role === 'super_admin';

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
    if (currentRole === 'technician') {
      title = 'My Reports';
      subtitle = 'Assigned jobs, parts used and personal expenses';
    } else if (currentRole === 'sales') {
      title = 'Sales Reports';
      subtitle = 'Employee-wise sales, repair, collection and outstanding activity';
    } else {
      title = 'Reports';
      subtitle = 'Sales, cash, COGS, profit/loss and staff analytics';
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

      <div className="topbar-right flex items-center gap-2.5">
        {isSuperAdmin ? (
          pathname === '/super-admin' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold shadow-xs">
              <ShieldCheck size={14} className="text-indigo-600" />
              <span>Platform Super Admin Hub</span>
            </div>
          ) : (
            <>
              {/* Operating Status Badge */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold shadow-xs select-none"
                title={`Platform Super Admin active operational scope in ${activeBranch?.branch_name || companyBranding?.company_name || 'Branch'}`}
              >
                <ShieldCheck size={14} className="text-amber-600" />
                <span>Super Admin — Operating in {activeBranch?.branch_name || activeBranch?.branch_code || 'Saad Communication'}</span>
              </div>

              {/* Return to Super Admin Button */}
              <button
                type="button"
                onClick={() => {
                  if (switchPortalView) switchPortalView('super_admin');
                  router.push('/super-admin');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Return to Master Super Admin Control Center"
              >
                <ShieldCheck size={14} />
                <span>Return to Super Admin</span>
              </button>
            </>
          )
        ) : (
          /* Normal User Branch Context Indicator */
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold shadow-xs select-none"
            title="Current Active Branch Database Scope"
          >
            <Building2 size={14} className="text-blue-600" />
            <span>{activeBranch?.branch_code || 'BR-01'}: {activeBranch?.branch_name || 'Saad Communication'}</span>
          </div>
        )}
      </div>
    </header>
  );
}

