'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/components/DynamicProvider';

interface LeaderboardPlayer {
  id: string;
  address: string;
  highScore: number;
  totalCoins: number;
  lastPlayed?: any;
}

interface LeaderboardProps {
  refreshTrigger?: number;
}

export function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const { primaryWallet, gameSettings } = useWallet();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(gameSettings?.leaderboardEnabled ?? true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setIsEnabled(Boolean(data.enabled));
        setPlayers(data.players || []);
      }
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, refreshTrigger, gameSettings?.leaderboardEnabled]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // If disabled via admin settings, do not render
  if (!isEnabled) {
    return null;
  }

  const connectedAddrLower = primaryWallet?.address?.toLowerCase();
  const userRankIndex = connectedAddrLower
    ? players.findIndex((p) => (p.address || p.id)?.toLowerCase() === connectedAddrLower)
    : -1;

  return (
    <div
      style={{
        marginTop: '24px',
        maxWidth: '880px',
        width: '100%',
        background: 'rgba(8, 16, 20, 0.92)',
        border: '1px solid rgba(255, 215, 0, 0.35)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        fontFamily: "'Press Start 2P', monospace",
        color: '#e0f2f1',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid rgba(255, 215, 0, 0.25)',
          paddingBottom: '14px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>🏆</span>
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#ffd700',
                letterSpacing: '1.5px',
                fontWeight: 900,
                textShadow: '0 0 8px rgba(255, 215, 0, 0.5)',
              }}
            >
              GLOBAL OPERATOR LEADERBOARD
            </div>
            <div style={{ fontSize: '7px', color: '#709ca6', marginTop: '3px' }}>
              Top cyber runners ranked on Robinhood Chain
            </div>
          </div>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={isLoading}
          style={{
            background: 'rgba(0, 255, 135, 0.15)',
            border: '1px solid rgba(0, 255, 135, 0.4)',
            color: '#00ff87',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '7px',
            fontFamily: "'Press Start 2P', monospace",
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ display: 'inline-block', animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>
            ↻
          </span>
          {isLoading ? 'SYNCING...' : 'REFRESH'}
        </button>
      </div>

      {/* Players List Table */}
      {isLoading && players.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '8px', color: '#709ca6' }}>
          ⏳ Accessing grid rankings...
        </div>
      ) : players.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>🚀</div>
          <div style={{ fontSize: '8.5px', color: '#00e5ff', marginBottom: '6px' }}>
            NO RECORDED RUNS YET
          </div>
          <div style={{ fontSize: '7px', color: '#709ca6' }}>
            Connect wallet and be the first operative to claim the #1 spot on the leaderboard!
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', fontSize: '7.5px', borderCollapse: 'collapse', minWidth: '460px' }}>
            <thead>
              <tr style={{ color: '#709ca6', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', width: '80px' }}>RANK</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>OPERATOR / WALLET</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', width: '110px' }}>HIGH SCORE</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', width: '120px' }}>BANKED COINS</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => {
                const addr = p.address || p.id;
                const isUser = connectedAddrLower && addr?.toLowerCase() === connectedAddrLower;
                const isCopied = copiedAddress === addr;

                return (
                  <tr
                    key={p.id || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isUser
                        ? 'rgba(0, 255, 135, 0.12)'
                        : idx % 2 === 0
                        ? 'rgba(255, 255, 255, 0.015)'
                        : 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Rank */}
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>
                      <span
                        style={{
                          color:
                            idx === 0
                              ? '#ffd700'
                              : idx === 1
                              ? '#c0c0c0'
                              : idx === 2
                              ? '#cd7f32'
                              : isUser
                              ? '#00ff87'
                              : '#709ca6',
                        }}
                      >
                        #{idx + 1} {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                      </span>
                    </td>

                    {/* Address / Operator */}
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            color: isUser ? '#00ff87' : '#00e5ff',
                            fontFamily: 'monospace',
                            fontSize: '8.5px',
                            fontWeight: isUser ? 'bold' : 'normal',
                          }}
                          title={addr}
                        >
                          {addr.length > 16
                            ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
                            : addr}
                        </span>

                        {isUser && (
                          <span
                            style={{
                              fontSize: '6.5px',
                              background: 'rgba(0, 255, 135, 0.25)',
                              border: '1px solid #00ff87',
                              color: '#00ff87',
                              padding: '2px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            YOU
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => copyToClipboard(addr)}
                          title="Copy full wallet address"
                          style={{
                            background: isCopied ? 'rgba(0, 255, 135, 0.2)' : 'rgba(0, 229, 255, 0.1)',
                            border: isCopied ? '1px solid #00ff87' : '1px solid rgba(0, 229, 255, 0.3)',
                            color: isCopied ? '#00ff87' : '#00e5ff',
                            borderRadius: '3px',
                            padding: '2px 4px',
                            fontSize: '6px',
                            cursor: 'pointer',
                            fontFamily: "'Press Start 2P', monospace",
                          }}
                        >
                          {isCopied ? 'COPIED!' : 'COPY'}
                        </button>
                      </div>
                    </td>

                    {/* High Score */}
                    <td
                      style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        color: '#00ff87',
                        fontWeight: 'bold',
                        fontSize: '8.5px',
                      }}
                    >
                      {p.highScore || 0}
                    </td>

                    {/* Banked Coins */}
                    <td
                      style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        color: '#ffd700',
                        fontWeight: 'bold',
                        fontSize: '8px',
                      }}
                    >
                      ⚡ {p.totalCoins?.toLocaleString() || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Connected User Standing Summary */}
      {connectedAddrLower && userRankIndex !== -1 && (
        <div
          style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: 'rgba(0, 255, 135, 0.08)',
            border: '1px solid rgba(0, 255, 135, 0.35)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '7.5px',
          }}
        >
          <div style={{ color: '#00ff87' }}>
            🎮 YOUR STANDING: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>#{userRankIndex + 1}</span> OF {players.length}
          </div>
          <div style={{ display: 'flex', gap: '14px', color: '#e0f2f1' }}>
            <span>BEST: <strong style={{ color: '#00e5ff' }}>{players[userRankIndex].highScore}</strong></span>
            <span>BANK: <strong style={{ color: '#ffd700' }}>⚡ {players[userRankIndex].totalCoins?.toLocaleString()}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
