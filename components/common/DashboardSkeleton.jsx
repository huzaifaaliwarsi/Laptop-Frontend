'use client';

import React from 'react';
import { Skeleton, StatCardsSkeleton } from './Skeleton';

export default function DashboardSkeleton({ role = 'admin' }) {
  return (
    <div className="space-y-4" style={{ minHeight: '600px', userSelect: 'none' }}>
      
      {/* Top Banner Skeleton */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
          borderRadius: 16,
          border: '1px solid #dce6f2',
          padding: '24px 28px',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: '240px' }}>
          <Skeleton width="180px" height="22px" />
          <Skeleton width="300px" height="13px" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Skeleton width="110px" height="34px" style={{ borderRadius: '8px' }} />
          <Skeleton width="130px" height="34px" style={{ borderRadius: '8px' }} />
        </div>
      </div>

      {/* KPI Cards Skeleton Grid */}
      <StatCardsSkeleton count={4} />

      {/* Main Grid: Left Table Skeleton & Right Panel Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Table Section */}
        <div className="lg:col-span-8 space-y-4">
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Skeleton width="140px" height="16px" />
              <Skeleton width="70px" height="12px" />
            </div>

            {/* Skeleton Table Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: row % 2 === 0 ? '#f8fafc' : '#ffffff',
                    borderRadius: 8,
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Skeleton width="32px" height="32px" style={{ borderRadius: '6px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Skeleton width="120px" height="12px" />
                      <Skeleton width="70px" height="10px" />
                    </div>
                  </div>
                  <Skeleton width="60px" height="20px" style={{ borderRadius: '9999px' }} />
                  <Skeleton width="80px" height="14px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Section */}
        <div className="lg:col-span-4 space-y-4">
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <Skeleton width="120px" height="16px" style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4].map((r) => (
                <div
                  key={r}
                  style={{
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <Skeleton width="80%" height="12px" />
                  <Skeleton width="50%" height="10px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
