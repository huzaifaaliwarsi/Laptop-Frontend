'use client';

import React from 'react';

/**
 * Base Skeleton Box (kept for backward compatibility where inline spans are needed)
 */
export function Skeleton({
  width = '100%',
  height = '14px',
  borderRadius,
  className = '',
  style = {}
}) {
  return (
    <span
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

/**
 * Smooth Blue Spinner for Tables (replaces table row skeletons)
 */
export function TableRowSkeleton({
  cols = 8,
  rows = 5,
  colSpan
}) {
  const span = colSpan || cols;
  return (
    <tr>
      <td colSpan={span} style={{ padding: '40px 16px', textAlign: 'center', border: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div className="loader loader-sm"></div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            Loading...
          </span>
        </div>
      </td>
    </tr>
  );
}

/**
 * Stat / KPI Cards Loader
 */
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div style={{ padding: '30px 16px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
      <div className="loader"></div>
    </div>
  );
}

/**
 * POS Product Grid Loader
 */
export function POSProductGridSkeleton({ count = 8 }) {
  return (
    <div style={{ padding: '40px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, width: '100%' }}>
      <div className="loader"></div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
        Loading...
      </span>
    </div>
  );
}

/**
 * Chat / List Item Loader
 */
export function ChatListSkeleton({ count = 6 }) {
  return (
    <div style={{ padding: '30px 16px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="loader loader-sm"></div>
    </div>
  );
}

/**
 * Details / Modal Form Loader
 */
export function DetailModalSkeleton() {
  return (
    <div style={{ padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div className="loader"></div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
        Loading details...
      </p>
    </div>
  );
}

export default Skeleton;
