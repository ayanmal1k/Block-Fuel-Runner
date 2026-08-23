'use client';

import React from 'react';
import { useWallet } from '@/components/DynamicProvider';

export function ConnectWalletButton({ className = '' }: { className?: string }) {
  const {
    primaryWallet,
    setShowAuthFlow,
    handleLogOut,
    tokenBalance,
    tokenSymbol,
    isCheckingBalance,
    isEligible,
    minTokenRequired,
    bankCoins,
  } = useWallet();

  if (primaryWallet?.address) {
    const shortAddr = `${primaryWallet.address.slice(0, 6)}...${primaryWallet.address.slice(-4)}`;

    return (
      <div className={`inline-flex items-center gap-3 flex-wrap ${className}`}>
        {/* Token Balance Badge */}
        <div
          style={{
            background: isEligible ? 'rgba(0, 255, 135, 0.12)' : 'rgba(255, 56, 56, 0.15)',
            border: `1px solid ${isEligible ? 'rgba(0, 255, 135, 0.4)' : 'rgba(255, 56, 56, 0.5)'}`,
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '8px',
            color: isEligible ? '#00ff87' : '#ff3838',
          }}
          title={isEligible ? 'Eligible to play' : `Requires min ${minTokenRequired} ${tokenSymbol}`}
        >
          <span>{isEligible ? '⚡' : '⚠️'}</span>
          <span>
            {isCheckingBalance ? '...' : `${tokenBalance.toFixed(2)} ${tokenSymbol}`}
          </span>
        </div>

        {/* Banked Coins Badge */}
        <div
          style={{
            background: 'rgba(255, 215, 0, 0.12)',
            border: '1px solid rgba(255, 215, 0, 0.35)',
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '8px',
            color: '#ffd700',
          }}
        >
          <span>🏦</span>
          <span>{bankCoins.toLocaleString()} COINS</span>
        </div>

        {/* Connected Wallet Address / Disconnect Button */}
        <button
          onClick={handleLogOut}
          style={{
            background: 'rgba(10, 20, 24, 0.85)',
            border: '1px solid rgba(0, 229, 255, 0.5)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '8px',
            color: '#00e5ff',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)',
            transition: 'all 0.2s ease',
          }}
          title="Click to Disconnect"
        >
          <span>🔗 {shortAddr}</span>
          <span style={{ marginLeft: '6px', color: '#ff7979', fontSize: '7px' }}>[✕]</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowAuthFlow(true)}
      style={{
        background: 'linear-gradient(90deg, #00ff87, #00e5ff)',
        color: '#060b0e',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '8px',
        cursor: 'pointer',
        boxShadow: '0 0 15px rgba(0, 255, 135, 0.4)',
        animation: 'neonPulse 2s ease-in-out infinite',
      }}
      className={className}
    >
      CONNECT WALLET
    </button>
  );
}
