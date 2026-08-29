'use client';

import React from 'react';

/**
 * Base Skeleton Box
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
 * Skeleton Rows for Tables (Generates multiple realistic placeholder rows)
 */
export function TableRowSkeleton({
  cols = 8,
  rows = 5,
  colSpan
}) {
  const rowList = Array.from({ length: rows });

  if (colSpan) {
    return (
      <tr className="skeleton-table-row">
        <td colSpan={colSpan} style={{ padding: '24px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rowList.map((_, rIdx) => (
              <div key={rIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 2 }}>
                  <Skeleton width="32px" height="32px" style={{ borderRadius: '8px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '70%' }}>
                    <Skeleton width="80%" height="13px" />
                    <Skeleton width="45%" height="10px" />
                  </div>
                </div>
                <Skeleton width="18%" height="12px" style={{ flex: 1 }} />
                <Skeleton width="12%" height="22px" style={{ borderRadius: '9999px', flexShrink: 0 }} />
                <Skeleton width="15%" height="14px" style={{ flex: 1 }} />
                <Skeleton width="60px" height="28px" style={{ borderRadius: '6px', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {rowList.map((_, rIdx) => (
        <tr key={rIdx} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx}>
              {cIdx === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Skeleton width="28px" height="28px" style={{ borderRadius: '6px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                    <Skeleton width="85%" height="12px" />
                    <Skeleton width="50%" height="9px" />
                  </div>
                </div>
              ) : cIdx === cols - 1 ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <Skeleton width="56px" height="26px" style={{ borderRadius: '6px' }} />
                </div>
              ) : cIdx % 3 === 0 ? (
                <Skeleton width="64px" height="20px" style={{ borderRadius: '9999px' }} />
              ) : (
                <Skeleton width={`${Math.max(45, Math.min(90, ((cIdx * 37 + rIdx * 19) % 50) + 40))}%`} height="12px" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Stat / KPI Cards Skeleton Grid
 */
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-card"
          style={{ padding: '18px 20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width="80px" height="12px" />
            <Skeleton width="28px" height="28px" style={{ borderRadius: '8px' }} />
          </div>
          <Skeleton width="130px" height="24px" style={{ marginBottom: 8 }} />
          <Skeleton width="90px" height="10px" />
        </div>
      ))}
    </div>
  );
}

/**
 * POS Product Grid Skeleton
 */
export function POSProductGridSkeleton({ count = 8 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-card"
          style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <Skeleton width="100%" height="110px" style={{ borderRadius: '8px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="85%" height="13px" />
            <Skeleton width="50%" height="10px" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
            <Skeleton width="60px" height="16px" />
            <Skeleton width="50px" height="22px" style={{ borderRadius: '6px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Chat / List Item Skeleton (WhatsApp & Messenger)
 */
export function ChatListSkeleton({ count = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #f1f5f9'
          }}
        >
          <Skeleton width="40px" height="40px" style={{ borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="110px" height="13px" />
              <Skeleton width="40px" height="10px" />
            </div>
            <Skeleton width="75%" height="10px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Details / Modal Form Skeleton
 */
export function DetailModalSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <Skeleton width="80px" height="80px" style={{ borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <Skeleton width="220px" height="20px" />
          <Skeleton width="140px" height="13px" />
          <Skeleton width="90px" height="11px" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Skeleton width="100%" height="60px" style={{ borderRadius: '8px' }} />
        <Skeleton width="100%" height="60px" style={{ borderRadius: '8px' }} />
        <Skeleton width="100%" height="60px" style={{ borderRadius: '8px' }} />
      </div>
      <Skeleton width="100%" height="140px" style={{ borderRadius: '10px' }} />
    </div>
  );
}

export default Skeleton;
