'use client';

import React, { useState, useEffect } from 'react';
import { GameSettings, DEFAULT_GAME_SETTINGS, getGameSettings } from '@/lib/gameSettings';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'players'>('settings');

  // Settings state
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Players state
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

  // Fetch players data from secure server API when authenticated
  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
      }
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
      setSaveSuccess('✅ Settings updated successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);
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
              fontSize: '13px',
              color: '#00ff87',
              letterSpacing: '2px',
              marginBottom: '8px',
            }}
          >
            ADMIN COMMAND CONSOLE
          </h1>
          <p style={{ fontSize: '7.5px', color: '#709ca6', marginBottom: '24px', lineHeight: '1.8' }}>
            Enter administrator credentials to configure minimum balance requirement and leaderboard settings.
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
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
            <div style={{ fontSize: '13px', color: '#00ff87', fontWeight: 900, letterSpacing: '1px' }}>
              ⚙️ BLOCK FUEL ADMIN NEXUS
            </div>
            <div style={{ fontSize: '7.5px', color: '#709ca6', marginTop: '4px' }}>
              Balance Requirements &bull; Leaderboard Settings &bull; Player Rankings
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

        {/* Overview Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: 'rgba(10, 20, 24, 0.85)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#709ca6', marginBottom: '6px' }}>TOTAL REGISTERED PLAYERS</div>
            <div style={{ fontSize: '18px', color: '#00ff87', fontWeight: 900 }}>{players.length}</div>
          </div>
          <div style={{ background: 'rgba(10, 20, 24, 0.85)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#709ca6', marginBottom: '6px' }}>MINIMUM TOKEN REQUIREMENT</div>
            <div style={{ fontSize: '18px', color: '#00e5ff', fontWeight: 900 }}>
              {settings.minTokenRequired > 0 ? `${settings.minTokenRequired.toLocaleString()} Tokens` : '0 (Free Access)'}
            </div>
          </div>
          <div style={{ background: 'rgba(10, 20, 24, 0.85)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#709ca6', marginBottom: '6px' }}>LEADERBOARD STATUS</div>
            <div style={{ fontSize: '15px', color: settings.leaderboardEnabled ? '#00ff87' : '#ff7979', fontWeight: 900 }}>
              {settings.leaderboardEnabled ? '🟢 ACTIVE' : '🔴 DISABLED'}
            </div>
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
            👥 LEADERBOARD & PLAYERS ({players.length})
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
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Section: Minimum Balance Requirement */}
              <div style={{ borderBottom: '1px solid rgba(0, 255, 135, 0.2)', paddingBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#00ff87', marginBottom: '14px', letterSpacing: '1px' }}>
                  🎯 MINIMUM BALANCE REQUIREMENT
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    MINIMUM TOKEN HOLDING TO PLAY
                  </label>
                  <input
                    type="number"
                    min="0"
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
                  <span style={{ fontSize: '6.5px', color: '#8aa5ad', marginTop: '6px', display: 'block' }}>
                    Required token balance on Robinhood Chain to play the game (Set 0 for open access).
                  </span>
                </div>
              </div>

              {/* Section: Network & Token Settings */}
              <div style={{ borderBottom: '1px solid rgba(0, 255, 135, 0.2)', paddingBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#00e5ff', marginBottom: '14px', letterSpacing: '1px' }}>
                  🔗 NETWORK & TOKEN SETTINGS
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                    TOKEN CONTRACT ADDRESS
                  </label>
                  <input
                    type="text"
                    value={settings.tokenAddress}
                    onChange={(e) => setSettings({ ...settings, tokenAddress: e.target.value })}
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
                  <span style={{ fontSize: '6.5px', color: '#8aa5ad', marginTop: '6px', display: 'block' }}>
                    The ERC-20 contract address used for balance checks.
                  </span>
                </div>
              </div>

              {/* Section: Leaderboard & Competition Settings */}
              <div>
                <div style={{ fontSize: '10px', color: '#ffd700', marginBottom: '14px', letterSpacing: '1px' }}>
                  🏆 LEADERBOARD & COMPETITION
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* Leaderboard Enable Switch */}
                  <div style={{ background: 'rgba(6, 15, 19, 0.7)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '8px', padding: '14px' }}>
                    <label style={{ display: 'block', fontSize: '8px', color: '#ffd700', marginBottom: '8px' }}>
                      LEADERBOARD VISIBILITY
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, leaderboardEnabled: !settings.leaderboardEnabled })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: settings.leaderboardEnabled ? 'rgba(0, 255, 135, 0.25)' : 'rgba(255, 56, 56, 0.2)',
                        border: settings.leaderboardEnabled ? '1px solid #00ff87' : '1px solid #ff5656',
                        borderRadius: '6px',
                        color: settings.leaderboardEnabled ? '#00ff87' : '#ff7979',
                        fontSize: '9px',
                        fontFamily: "'Press Start 2P', monospace",
                        cursor: 'pointer',
                      }}
                    >
                      {settings.leaderboardEnabled ? '✅ LEADERBOARD ENABLED' : '⛔ LEADERBOARD DISABLED'}
                    </button>
                    <span style={{ fontSize: '6.5px', color: '#8aa5ad', marginTop: '6px', display: 'block' }}>
                      Controls whether the global leaderboard is active for players.
                    </span>
                  </div>

                  {/* Maintenance Mode Switch */}
                  <div style={{ background: 'rgba(6, 15, 19, 0.7)', border: '1px solid rgba(255, 100, 100, 0.25)', borderRadius: '8px', padding: '14px' }}>
                    <label style={{ display: 'block', fontSize: '8px', color: '#ff7979', marginBottom: '8px' }}>
                      MAINTENANCE MODE
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: settings.maintenanceMode ? 'rgba(255, 56, 56, 0.25)' : 'rgba(0, 255, 135, 0.15)',
                        border: settings.maintenanceMode ? '1px solid #ff5656' : '1px solid rgba(0, 255, 135, 0.4)',
                        color: settings.maintenanceMode ? '#ff7979' : '#00ff87',
                        fontSize: '9px',
                        fontFamily: "'Press Start 2P', monospace",
                        cursor: 'pointer',
                      }}
                    >
                      {settings.maintenanceMode ? '⚠️ MAINTENANCE ACTIVE' : '✅ GAME OPERATIONAL'}
                    </button>
                    <span style={{ fontSize: '6.5px', color: '#8aa5ad', marginTop: '6px', display: 'block' }}>
                      Put game into maintenance mode if updates are being deployed.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                      COMPETITION START DATE (OPTIONAL)
                    </label>
                    <input
                      type="datetime-local"
                      value={settings.startDate || ''}
                      onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(6, 15, 19, 0.9)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '6px',
                        color: '#ffd700',
                        fontSize: '9px',
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                      COMPETITION END DATE (OPTIONAL)
                    </label>
                    <input
                      type="datetime-local"
                      value={settings.endDate || ''}
                      onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(6, 15, 19, 0.9)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '6px',
                        color: '#ffd700',
                        fontSize: '9px',
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    />
                  </div>
                </div>
              </div>

              {saveSuccess && (
                <div style={{ color: '#00ff87', fontSize: '8px', padding: '10px', background: 'rgba(0,255,135,0.15)', borderRadius: '6px', border: '1px solid #00ff87' }}>
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
                {isSaving ? 'SAVING SETTINGS...' : 'SAVE SETTINGS'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Players / Leaderboard */}
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
              GLOBAL PLAYER LEADERBOARD ({players.length} PLAYERS)
            </div>
            {players.length === 0 ? (
              <div style={{ fontSize: '8px', color: '#709ca6', padding: '16px', textAlign: 'center' }}>
                No players recorded yet.
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
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, idx) => (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', color: idx === 0 ? '#ffd700' : idx === 1 ? '#00e5ff' : '#709ca6', fontWeight: 'bold' }}>
                          #{idx + 1} {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                        </td>
                        <td style={{ padding: '8px', color: '#00e5ff', fontFamily: 'monospace', fontSize: '8px', wordBreak: 'break-all' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ userSelect: 'all' }}>{p.address || p.id}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(p.address || p.id);
                                alert('Wallet address copied to clipboard!');
                              }}
                              title="Copy full address"
                              style={{
                                background: 'rgba(0, 229, 255, 0.15)',
                                border: '1px solid rgba(0, 229, 255, 0.4)',
                                color: '#00e5ff',
                                borderRadius: '4px',
                                padding: '2px 5px',
                                fontSize: '6.5px',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', monospace",
                              }}
                            >
                              📋 COPY
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '8px', color: '#00ff87', fontWeight: 'bold' }}>
                          {p.highScore || 0}
                        </td>
                        <td style={{ padding: '8px', color: '#ffd700' }}>
                          ⚡ {p.totalCoins?.toLocaleString() || 0}
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
