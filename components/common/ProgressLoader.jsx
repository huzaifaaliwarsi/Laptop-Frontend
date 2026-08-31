'use client';

import React from 'react';

/**
 * Smooth Blue Conic Spinner Loader Component
 * Supports fullScreen, tableRow, compact, and embedded container views.
 */
export default function ProgressLoader({
  message = 'Loading...',
  fullScreen = false,
  tableRow = false,
  colSpan = 10,
  compact = false,
  minHeight = compact ? '140px' : '220px',
  className = ''
}) {
  const content = (
    <div
      className={`loader-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '20px 12px' : '36px 20px',
        width: '100%',
        minHeight: fullScreen ? '100vh' : minHeight,
        background: fullScreen ? '#f8fafc' : 'transparent',
        userSelect: 'none',
        gap: compact ? 10 : 14
      }}
    >
      <div className={`loader ${compact ? 'loader-sm' : ''}`}></div>
      {message && (
        <p
          className="loader-text"
          style={{
            margin: 0,
            fontSize: compact ? 12 : 13,
            fontWeight: 600,
            color: '#64748b'
          }}
        >
          {message}
        </p>
      )}
    </div>
  );

  if (tableRow) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0, border: 'none' }}>
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
