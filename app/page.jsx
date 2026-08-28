'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardPage from './dashboard/page';
import TechnicianDashboardPage from './technician/page';

export default function Home() {
  const { role } = useAuth();

  if (role === 'technician') {
    return <TechnicianDashboardPage />;
  }

  return <DashboardPage />;
}
