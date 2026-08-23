'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="cyber-grid-bg"
      style={{
        minHeight: 'calc(100vh - 65px)',
        background: 'linear-gradient(145deg, #050b0e 0%, #0a1418 50%, #071013 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 16px',
        fontFamily: "'Press Start 2P', monospace",
        color: '#e0f2f1',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(10, 20, 24, 0.95)',
          border: '1px solid rgba(255, 56, 56, 0.4)',
          borderRadius: '16px',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 0 35px rgba(255, 56, 56, 0.2)',
        }}
      >
        <div style={{ fontSize: '42px', marginBottom: '16px', animation: 'neonPulse 1.5s infinite' }}>
          🚫
        </div>

        <div
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#ff5e57',
            textShadow: '0 0 15px rgba(255, 94, 87, 0.6)',
            marginBottom: '14px',
            letterSpacing: '2px',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '13px',
            color: '#00ff87',
            marginBottom: '16px',
            lineHeight: '1.6',
            letterSpacing: '1px',
          }}
        >
          SECTOR NOT FOUND
        </h1>

        <p
          style={{
            fontSize: '8px',
            color: '#709ca6',
            lineHeight: '1.9',
            marginBottom: '28px',
          }}
        >
          The requested cyber corridor does not exist or has been temporarily decommissioned by network security protocols.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '14px 24px',
            background: 'linear-gradient(90deg, #00ff87, #00e5ff)',
            color: '#060b0e',
            textDecoration: 'none',
            fontSize: '9px',
            fontWeight: 900,
            borderRadius: '8px',
            boxShadow: '0 0 20px rgba(0, 255, 135, 0.4)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          ⚡ RETURN TO GAME
        </Link>
      </div>
    </div>
  );
}
