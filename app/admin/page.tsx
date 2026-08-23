'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { GameSettings, DEFAULT_GAME_SETTINGS, getGameSettings } from '@/lib/gameSettings';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'withdrawals' | 'players'>('settings');

  // Settings state
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Data states
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Check saved session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = sessionStorage.getItem('block_fuel_admin_auth');
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Fetch initial settings
  useEffect(() => {
    getGameSettings().then(setSettings);
  }, []);

  // Fetch data when authenticated
  const loadAdminData = async () => {
    if (!db || !db.type) return;
    setIsLoadingData(true);
    try {
      // Fetch withdrawals
      const wSnap = await getDocs(collection(db, 'withdrawals'));
      const wList: any[] = [];
      wSnap.forEach((d) => wList.push({ id: d.id, ...d.data() }));
      setWithdrawals(wList.reverse());

      // Fetch users
      const uSnap = await getDocs(collection(db, 'users'));
      const uList: any[] = [];
      uSnap.forEach((d) => uList.push({ id: d.id, ...d.data() }));
      uList.sort((a, b) => (b.highScore || 0) - (a.highScore || 0));
      setPlayers(uList);
    } catch (err) {
      console.warn('Admin data load note:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      setIsAuthenticated(true);
      sessionStorage.setItem('block_fuel_admin_auth', 'true');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('block_fuel_admin_auth');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }
      setSaveSuccess('✅ Game settings updated successfully in Firestore!');
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div
        className="cyber-grid-bg"
        style={{
          minHeight: 'calc(100vh - 65px)',
          background: 'linear-gradient(145deg, #050b0e 0%, #0a1418 50%, #071013 100%)',
          padding: '40px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: "'Press Start 2P', monospace",
          color: '#e0f2f1',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: 'rgba(10, 20, 24, 0.95)',
            border: '1px solid rgba(0, 255, 135, 0.4)',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 0 35px rgba(0, 255, 135, 0.2)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔐</div>
          <h1
            style={{
              fontSize: '14px',
              color: '#00ff87',
              letterSpacing: '2px',
              marginBottom: '8px',
            }}
          >
            ADMIN COMMAND CONSOLE
          </h1>
          <p style={{ fontSize: '7.5px', color: '#709ca6', marginBottom: '24px', lineHeight: '1.8' }}>
            Enter authorized master administrator credentials to access the Block Fuel control nexus.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', textAlign: 'left', marginBottom: '6px' }}>
                ADMIN USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(6, 15, 19, 0.9)',
                  border: '1px solid rgba(0, 255, 135, 0.3)',
                  borderRadius: '6px',
                  color: '#00ff87',
                  fontSize: '9px',
                  fontFamily: "'Press Start 2P', monospace",
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', textAlign: 'left', marginBottom: '6px' }}>
                PASSWORD KEY
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(6, 15, 19, 0.9)',
                  border: '1px solid rgba(0, 255, 135, 0.3)',
                  borderRadius: '6px',
                  color: '#00ff87',
                  fontSize: '9px',
                  fontFamily: "'Press Start 2P', monospace",
                  outline: 'none',
                }}
              />
            </div>

            {loginError && (
              <div style={{ color: '#ff7979', fontSize: '8px', textAlign: 'left' }}>
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                marginTop: '8px',
                padding: '12px',
                background: 'linear-gradient(90deg, #00ff87, #00e5ff)',
                color: '#060b0e',
                border: 'none',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: 'bold',
                fontFamily: "'Press Start 2P', monospace",
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(0, 255, 135, 0.4)',
              }}
            >
              AUTHENTICATE ACCESS
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div
      className="cyber-grid-bg"
      style={{
        minHeight: 'calc(100vh - 65px)',
        background: 'linear-gradient(145deg, #050b0e 0%, #0a1418 50%, #071013 100%)',
        padding: '24px 16px',
        fontFamily: "'Press Start 2P', monospace",
        color: '#e0f2f1',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(0, 255, 135, 0.25)',
            paddingBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: '#00ff87', fontWeight: 900, letterSpacing: '1px' }}>
              ⚙️ BLOCK FUEL ADMIN NEXUS
            </div>
            <div style={{ fontSize: '7.5px', color: '#709ca6', marginTop: '4px' }}>
              Economics &bull; Withdrawals &bull; Player Accounts &bull; Robinhood Chain
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={loadAdminData}
              style={{
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                color: '#00e5ff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '8px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              🔄 REFRESH
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 56, 56, 0.15)',
                border: '1px solid rgba(255, 56, 56, 0.4)',
                color: '#ff7979',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '8px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: 'rgba(10, 20, 24, 0.85)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#709ca6', marginBottom: '4px' }}>TOTAL PLAYERS</div>
            <div style={{ fontSize: '16px', color: '#00ff87', fontWeight: 900 }}>{players.length}</div>
          </div>
          <div style={{ background: 'rgba(10, 20, 24, 0.85)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#709ca6', marginBottom: '4px' }}>TOTAL WITHDRAWALS</div>
            <div style={{ fontSize: '16px', color: '#ffd700', fontWeight: 900 }}>{withdrawals.length}</div>
          </div>
          <div style={{ background: 'rgba(10, 20, 24, 0.85)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#709ca6', marginBottom: '4px' }}>EXCHANGE RATE</div>
            <div style={{ fontSize: '16px', color: '#00e5ff', fontWeight: 900 }}>{settings.coinsPerToken} : 1</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              background: activeTab === 'settings' ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
              border: activeTab === 'settings' ? '1px solid rgba(0, 255, 135, 0.5)' : '1px solid transparent',
              color: activeTab === 'settings' ? '#00ff87' : '#709ca6',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '8px',
              fontFamily: "'Press Start 2P', monospace",
              cursor: 'pointer',
            }}
          >
            ⚙️ GAME SETTINGS
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            style={{
              background: activeTab === 'withdrawals' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              border: activeTab === 'withdrawals' ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid transparent',
              color: activeTab === 'withdrawals' ? '#00e5ff' : '#709ca6',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '8px',
              fontFamily: "'Press Start 2P', monospace",
              cursor: 'pointer',
            }}
          >
            📋 WITHDRAWALS ({withdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('players')}
            style={{
              background: activeTab === 'players' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
              border: activeTab === 'players' ? '1px solid rgba(255, 215, 0, 0.5)' : '1px solid transparent',
              color: activeTab === 'players' ? '#ffd700' : '#709ca6',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '8px',
              fontFamily: "'Press Start 2P', monospace",
              cursor: 'pointer',
            }}
          >
            👥 PLAYERS ({players.length})
          </button>
        </div>

        {/* Tab 1: Game Settings */}
        {activeTab === 'settings' && (
          <div
            style={{
              background: 'rgba(10, 20, 24, 0.9)',
              border: '1px solid rgba(0, 255, 135, 0.35)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    MINIMUM TOKEN REQUIREMENT
                  </label>
                  <input
                    type="number"
                    value={settings.minTokenRequired}
                    onChange={(e) => setSettings({ ...settings, minTokenRequired: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 255, 135, 0.3)',
                      borderRadius: '6px',
                      color: '#00ff87',
                      fontSize: '9px',
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  />
                  <span style={{ fontSize: '6.5px', color: '#8aa5ad', marginTop: '4px', display: 'block' }}>
                    Holdings required on Robinhood Chain to play / withdraw (0 = open access)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    EXCHANGE RATE (COINS PER TOKEN)
                  </label>
                  <input
                    type="number"
                    value={settings.coinsPerToken}
                    onChange={(e) => setSettings({ ...settings, coinsPerToken: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 255, 135, 0.3)',
                      borderRadius: '6px',
                      color: '#00ff87',
                      fontSize: '9px',
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  />
                  <span style={{ fontSize: '6.5px', color: '#8aa5ad', marginTop: '4px', display: 'block' }}>
                    Number of in-game Fuel Coins exchanged per 1 token (e.g. 10 coins = 1 token)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    MINIMUM WITHDRAWAL (COINS)
                  </label>
                  <input
                    type="number"
                    value={settings.minWithdrawCoins}
                    onChange={(e) => setSettings({ ...settings, minWithdrawCoins: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 255, 135, 0.3)',
                      borderRadius: '6px',
                      color: '#00ff87',
                      fontSize: '9px',
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    ROBINHOOD CHAIN ID (EVM)
                  </label>
                  <input
                    type="number"
                    value={settings.chainId}
                    onChange={(e) => setSettings({ ...settings, chainId: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#00e5ff',
                      fontSize: '9px',
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    TOKEN CONTRACT ADDRESS (Robinhood Chain ERC-20)
                  </label>
                  <input
                    type="text"
                    value={settings.tokenAddress}
                    onChange={(e) => setSettings({ ...settings, tokenAddress: e.target.value })}
                    placeholder="0x0000000000000000000000000000000000000000"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#00e5ff',
                      fontSize: '9px',
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    ROBINHOOD CHAIN RPC ENDPOINT
                  </label>
                  <input
                    type="text"
                    value={settings.rpcUrl}
                    onChange={(e) => setSettings({ ...settings, rpcUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#00e5ff',
                      fontSize: '9px',
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  />
                </div>
              </div>

              {saveSuccess && (
                <div style={{ color: '#00ff87', fontSize: '8px', padding: '8px', background: 'rgba(0,255,135,0.1)', borderRadius: '6px' }}>
                  {saveSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(90deg, #00ff87, #00e5ff)',
                  color: '#060b0e',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  fontFamily: "'Press Start 2P', monospace",
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 15px rgba(0, 255, 135, 0.3)',
                  alignSelf: 'flex-start',
                }}
              >
                {isSaving ? 'SAVING CONFIG...' : 'SAVE SETTINGS TO FIRESTORE'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div
            style={{
              background: 'rgba(10, 20, 24, 0.9)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '9px', color: '#00e5ff', marginBottom: '12px' }}>
              ALL WITHDRAWAL RECORDS ({withdrawals.length})
            </div>
            {withdrawals.length === 0 ? (
              <div style={{ fontSize: '8px', color: '#709ca6', padding: '16px', textAlign: 'center' }}>
                No withdrawal records recorded.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '7.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#709ca6', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>USER ADDRESS</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>COINS</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>TOKENS PAID</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>STATUS</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>TX HASH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', color: '#00e5ff' }}>
                          {w.userAddress ? `${w.userAddress.slice(0, 6)}...${w.userAddress.slice(-4)}` : 'N/A'}
                        </td>
                        <td style={{ padding: '8px', color: '#ffd700' }}>⚡ {w.amountCoins}</td>
                        <td style={{ padding: '8px', color: '#00ff87' }}>{w.tokensPaid}</td>
                        <td style={{ padding: '8px', color: '#00e5ff' }}>{w.status?.toUpperCase() || 'COMPLETED'}</td>
                        <td style={{ padding: '8px', color: '#709ca6' }}>
                          {w.txHash ? `${w.txHash.slice(0, 10)}...` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Players */}
        {activeTab === 'players' && (
          <div
            style={{
              background: 'rgba(10, 20, 24, 0.9)',
              border: '1px solid rgba(255, 215, 0, 0.35)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '9px', color: '#ffd700', marginBottom: '12px' }}>
              REGISTERED PLAYER PROFILES ({players.length})
            </div>
            {players.length === 0 ? (
              <div style={{ fontSize: '8px', color: '#709ca6', padding: '16px', textAlign: 'center' }}>
                No player profiles stored in Firestore yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '7.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#709ca6', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>RANK</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>WALLET ADDRESS</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>HIGH SCORE</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>BANKED COINS</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>TOTAL WITHDRAWN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, idx) => (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', color: idx === 0 ? '#ffd700' : idx === 1 ? '#00e5ff' : '#709ca6' }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: '8px', color: '#00e5ff' }}>
                          {p.address ? `${p.address.slice(0, 6)}...${p.address.slice(-4)}` : p.id}
                        </td>
                        <td style={{ padding: '8px', color: '#00ff87', fontWeight: 'bold' }}>
                          {p.highScore || 0}
                        </td>
                        <td style={{ padding: '8px', color: '#ffd700' }}>
                          ⚡ {p.totalCoins?.toLocaleString() || 0}
                        </td>
                        <td style={{ padding: '8px', color: '#709ca6' }}>
                          {p.totalWithdrawn?.toLocaleString() || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
