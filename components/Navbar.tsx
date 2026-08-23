'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: '🎮 PLAY', href: '/' },
    { label: '💰 WITHDRAW', href: '/withdraw' },
    { label: '⚙️ ADMIN', href: '/admin' },
  ];

  return (
    <header
      style={{
        width: '100%',
        background: 'rgba(6, 11, 14, 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 255, 135, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Brand / Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '16px', animation: 'neonPulse 2s infinite' }}>⚡</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 900,
              background: 'linear-gradient(90deg, #00ff87, #00e5ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '1.5px',
            }}
          >
            BLOCK FUEL
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: 'none',
                  fontSize: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  background: isActive ? 'rgba(0, 255, 135, 0.15)' : 'transparent',
                  color: isActive ? '#00ff87' : '#709ca6',
                  border: isActive ? '1px solid rgba(0, 255, 135, 0.4)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 10px rgba(0, 255, 135, 0.2)' : 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet Widget */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
