'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import DashboardPage from './dashboard/page';
import TechnicianDashboardPage from './technician/page';
import ProgressLoader from '../components/common/ProgressLoader';

export default function Home() {
  const { role, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && role) {
      if (role === 'super_admin') {
        router.replace('/super-admin');
      } else if (role === 'technician') {
        router.replace('/technician');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [role, isAuthenticated, loading, router]);

  if (loading) {
    return <ProgressLoader fullScreen message="Loading portal..." />;
  }

  if (role === 'technician') {
    return <TechnicianDashboardPage />;
  }

  return <DashboardPage />;
}
