'use client';

import React from 'react';

export default function DashboardSkeleton({ role = 'admin' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%',
        gap: 16
      }}
    >
      <div className="loader"></div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
        Loading..
      </p>
    </div>
  );
}
