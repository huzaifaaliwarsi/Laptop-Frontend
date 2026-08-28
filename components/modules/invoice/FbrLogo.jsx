'use client';

import React from 'react';

/**
 * Official FBR Pakistan Transparent Logo
 * Features the green arc, golden starburst, and cyan-to-blue gradient FBR lettering with NO dark background.
 */
export default function FbrLogo({ width = 140, height = 70, className = '' }) {
  return (
    <div
      className={`fbr-logo-transparent ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: width,
        height: height,
        backgroundColor: 'transparent',
        userSelect: 'none'
      }}
    >
      <svg
        viewBox="0 0 400 200"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Blue Gradient for FBR */}
          <linearGradient id="fbrBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00b4d8" />
            <stop offset="25%" stopColor="#0096c7" />
            <stop offset="60%" stopColor="#0077b6" />
            <stop offset="100%" stopColor="#023e8a" />
          </linearGradient>

          {/* Green Gradient for Arc */}
          <linearGradient id="fbrGreenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4d7c0f" />
            <stop offset="30%" stopColor="#84cc16" />
            <stop offset="50%" stopColor="#a3e635" />
            <stop offset="70%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </linearGradient>

          {/* Gold Gradient for Star */}
          <radialGradient id="fbrStarGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
        </defs>

        {/* 1. Green Curved Arc (tapered on left and right) */}
        <path
          d="M 10 110 Q 200 15 390 110 Q 200 35 10 110 Z"
          fill="url(#fbrGreenGrad)"
        />

        {/* 2. Golden Radiant Star at apex */}
        <g transform="translate(200, 75)">
          {/* Primary Vertical Long Spike */}
          <polygon
            points="0,-48 4,-10 0,0 -4,-10"
            fill="url(#fbrStarGrad)"
          />
          <polygon
            points="0,35 4,10 0,0 -4,10"
            fill="url(#fbrStarGrad)"
          />
          {/* Primary Horizontal Long Spike */}
          <polygon
            points="-52,0 -12,-4 0,0 -12,4"
            fill="url(#fbrStarGrad)"
          />
          <polygon
            points="52,0 12,-4 0,0 12,4"
            fill="url(#fbrStarGrad)"
          />
          {/* Diagonal Spikes */}
          <polygon
            points="-24,-24 -6,-8 0,0 -8,-6"
            fill="#eab308"
          />
          <polygon
            points="24,-24 8,-6 0,0 6,-8"
            fill="#eab308"
          />
          <polygon
            points="-24,24 -8,6 0,0 -6,8"
            fill="#eab308"
          />
          <polygon
            points="24,24 6,8 0,0 8,6"
            fill="#eab308"
          />
          {/* Center Glow */}
          <circle cx="0" cy="0" r="4.5" fill="#fef9c3" />
        </g>

        {/* 3. Bold FBR Text */}
        <text
          x="200"
          y="150"
          textAnchor="middle"
          fill="url(#fbrBlueGrad)"
          fontSize="88"
          fontWeight="900"
          fontFamily="Arial Black, Impact, sans-serif"
          letterSpacing="2"
        >
          FBR
        </text>

        {/* 4. PAKISTAN Text */}
        <text
          x="200"
          y="178"
          textAnchor="middle"
          fill="#023e8a"
          fontSize="22"
          fontWeight="800"
          fontFamily="Arial, sans-serif"
          letterSpacing="5"
        >
          PAKISTAN
        </text>
      </svg>
    </div>
  );
}
