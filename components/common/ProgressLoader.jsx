'use client';

import React, { useState, useEffect } from 'react';

/**
 * Modern Clean Percentage Progress Loader
 * Features:
 * - Large elegant percentage indicator (300 font-weight)
 * - Rounded blue gradient progress bar with animated shimmer glow
 * - Descriptive subtitle
 * - Subtle bottom divider
 * - Supports fullScreen, tableRow, compact, and card layouts
 */
export default function ProgressLoader({
  message = 'Please wait while the application is loading...',
  fullScreen = false,
  tableRow = false,
  colSpan = 10,
  compact = false,
  minHeight = compact ? '180px' : '260px',
  className = ''
}) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth natural progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) {
          return prev + Math.floor(Math.random() * 8) + 4;
        } else if (prev < 78) {
          return prev + Math.floor(Math.random() * 4) + 2;
        } else if (prev < 92) {
          return prev + 1;
        } else if (prev < 97) {
          return Math.min(97, prev + 0.5);
        }
        return prev;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const displayPercent = Math.min(99, Math.floor(progress));

  const loaderContent = (
    <div
      className={`progress-loader-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '24px 16px' : '40px 24px',
        width: '100%',
        minHeight: fullScreen ? '100vh' : minHeight,
        background: fullScreen ? 'radial-gradient(circle at 50% 30%, #f8fbff 0%, #edf4fc 100%)' : 'transparent',
        userSelect: 'none'
      }}
    >
      {/* Wrapper box with max-width */}
      <div style={{ maxWidth: compact ? '320px' : '440px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Large Percentage Text */}
        <div
          style={{
            fontSize: compact ? '36px' : '52px',
            fontWeight: 300,
            color: '#1e293b',
            lineHeight: 1,
            marginBottom: compact ? '12px' : '16px',
            letterSpacing: '-0.03em',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          {displayPercent}%
        </div>

        {/* Progress Bar Track */}
        <div
          style={{
            width: '100%',
            height: compact ? '6px' : '9px',
            backgroundColor: '#e9eef5',
            borderRadius: '9999px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
          }}
        >
          {/* Animated Blue Progress Bar Fill */}
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 60%, #60a5fa 100%)',
              borderRadius: '9999px',
              transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 12px rgba(37, 99, 235, 0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer / light effect across the blue bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'progressShimmer 1.8s infinite linear'
              }}
            />
          </div>
        </div>

        {/* Subtitle message */}
        <p
          style={{
            marginTop: compact ? '12px' : '16px',
            marginBottom: compact ? '12px' : '16px',
            fontSize: compact ? '12px' : '13.5px',
            color: '#64748b',
            fontWeight: 400,
            letterSpacing: '-0.01em',
            lineHeight: 1.4
          }}
        >
          {message}
        </p>

        {/* Delicate subtle bottom divider */}
        <div
          style={{
            width: compact ? '80px' : '120px',
            height: '1px',
            backgroundColor: '#e2e8f0',
            marginTop: '2px'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes progressShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );

  if (tableRow) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0, border: 'none' }}>
          {loaderContent}
        </td>
      </tr>
    );
  }

  return loaderContent;
}
