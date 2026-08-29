'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

import ProgressLoader from '../common/ProgressLoader';
import TopRouteProgressBar from '../common/TopRouteProgressBar';

export default function AppShell({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return <ProgressLoader fullScreen message="Please wait while the application is loading..." />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <TopRouteProgressBar />
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
