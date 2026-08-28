'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="grid place-items-center min-h-screen bg-slate-100/70">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center mx-auto mb-3 text-lg">
            <span>⏳</span>
          </div>
          <p className="text-slate-500 font-semibold text-xs">Loading system...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <div className="app">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <section className="shell min-w-0 flex flex-col">
          <Topbar onToggleMenu={() => setMobileMenuOpen(prev => !prev)} />
          <main className="content p-3 sm:p-4 lg:p-6 max-w-[1680px] w-full mx-auto flex-1">
            {children}
          </main>
        </section>
      </div>
      {mobileMenuOpen && (
        <div
          className="mobile-overlay open"
          onClick={() => setMobileMenuOpen(false)}
          id="mobileOverlay"
          aria-hidden="true"
        />
      )}
    </>
  );
}
