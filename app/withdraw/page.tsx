'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/DynamicProvider';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

interface WithdrawalRecord {
  id: string;
  amountCoins: number;
  tokensPaid: number;
  destinationAddress: string;
  status: string;
  txHash: string;
  createdAt: any;
}

export default function WithdrawPage() {
  const {
    primaryWallet,
    setShowAuthFlow,
    tokenBalance,
    tokenSymbol,
    isEligible,
    minTokenRequired,
    bankCoins,
    gameSettings,
    refreshBankCoins,
  } = useWallet();

  const [withdrawCoins, setWithdrawCoins] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);

  const coins = Number(withdrawCoins) || 0;
  const rate = gameSettings.coinsPerToken || 10;
  const estimatedTokens = coins > 0 ? (coins / rate).toFixed(4) : '0.0000';
  const minCoins = gameSettings.minWithdrawCoins || 100;

  // Set default recipient address when wallet connects
  useEffect(() => {
    if (primaryWallet?.address && !recipient) {
      setRecipient(primaryWallet.address);
    }
  }, [primaryWallet, recipient]);

  // Load user withdrawal history from Firestore
  const loadHistory = async () => {
    if (!primaryWallet?.address || !db || !db.type) return;
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('userAddress', '==', primaryWallet.address.toLowerCase()),
        limit(15)
      );
      const snap = await getDocs(q);
      const list: WithdrawalRecord[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as WithdrawalRecord);
      });
      setHistory(list);
    } catch (err) {
      console.warn('History fetch note:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [primaryWallet]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!primaryWallet?.address) {
      setShowAuthFlow(true);
      return;
    }

    if (!isEligible && minTokenRequired > 0) {
      setErrorMessage(
        `Minimum Balance Required: You must hold at least ${minTokenRequired} ${tokenSymbol} on Robinhood Chain to process withdrawals. Your current balance is ${tokenBalance.toFixed(2)}.`
      );
      return;
    }

    if (coins < minCoins) {
      setErrorMessage(`Minimum withdrawal is ${minCoins.toLocaleString()} Fuel Coins.`);
      return;
    }

    if (coins > bankCoins) {
      setErrorMessage(`Insufficient balance. You currently have ${bankCoins.toLocaleString()} Fuel Coins banked.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: primaryWallet.address,
          destinationAddress: recipient || primaryWallet.address,
          amountCoins: coins,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setSuccessMessage(
        `🎉 Successfully exchanged ${data.coinsDeducted.toLocaleString()} Fuel Coins for ${data.tokensPaid} ${tokenSymbol}! Tx: ${data.txHash.slice(0, 10)}...`
      );
      setWithdrawCoins('');
      await refreshBankCoins();
      await loadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during withdrawal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="cyber-grid-bg"
      style={{
        minHeight: 'calc(100vh - 65px)',
        background: 'linear-gradient(145deg, #050b0e 0%, #0a1418 50%, #071013 100%)',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Press Start 2P', monospace",
        color: '#e0f2f1',
      }}
    >
      <div style={{ maxWidth: '780px', width: '100%' }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              marginBottom: '10px',
            }}
          >
            <span>⚡</span>
            <span style={{ fontSize: '8px', color: '#ffd700', letterSpacing: '2px' }}>
              FUEL COIN EXCHANGER // ROBINHOOD CHAIN
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)',
              fontWeight: 900,
              color: 'transparent',
              background: 'linear-gradient(90deg, #ffd700 0%, #00ff87 50%, #00e5ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '2px',
              margin: '6px 0',
            }}
          >
            WITHDRAW REWARDS
          </h1>
          <p style={{ color: '#709ca6', fontSize: '8px', lineHeight: '1.8' }}>
            Convert your in-game Fuel Coins into real on-chain tokens on Robinhood Chain.
          </p>
        </div>

        {/* Balance & Overview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: 'rgba(10, 20, 24, 0.85)',
              border: '1px solid rgba(255, 215, 0, 0.35)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '7.5px', color: '#709ca6', marginBottom: '6px' }}>
              BANKED FUEL COINS
            </div>
            <div style={{ fontSize: '20px', color: '#ffd700', fontWeight: 900 }}>
              ⚡ {bankCoins.toLocaleString()}
            </div>
            <div style={{ fontSize: '7px', color: '#8aa5ad', marginTop: '6px' }}>
              ≈ {(bankCoins / rate).toFixed(2)} {tokenSymbol}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(10, 20, 24, 0.85)',
              border: '1px solid rgba(0, 255, 135, 0.35)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '7.5px', color: '#709ca6', marginBottom: '6px' }}>
              EXCHANGE RATIO
            </div>
            <div style={{ fontSize: '15px', color: '#00ff87', fontWeight: 900 }}>
              {rate} COINS = 1 {tokenSymbol}
            </div>
            <div style={{ fontSize: '7px', color: '#8aa5ad', marginTop: '6px' }}>
              Min: {minCoins.toLocaleString()} Coins
            </div>
          </div>

          <div
            style={{
              background: 'rgba(10, 20, 24, 0.85)',
              border: isEligible
                ? '1px solid rgba(0, 229, 255, 0.35)'
                : '1px solid rgba(255, 56, 56, 0.5)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '7.5px', color: '#709ca6', marginBottom: '6px' }}>
              WALLET ELIGIBILITY
            </div>
            <div
              style={{
                fontSize: '14px',
                color: isEligible ? '#00e5ff' : '#ff3838',
                fontWeight: 900,
              }}
            >
              {isEligible ? 'ACTIVE ✓' : 'LOCKED ✕'}
            </div>
            <div style={{ fontSize: '7px', color: '#8aa5ad', marginTop: '6px' }}>
              Required: {minTokenRequired} {tokenSymbol} (Hold: {tokenBalance.toFixed(1)})
            </div>
          </div>
        </div>

        {/* Withdrawal Form Card */}
        <div
          style={{
            background: 'rgba(10, 20, 24, 0.9)',
            border: '1px solid rgba(0, 255, 135, 0.35)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#00ff87',
              marginBottom: '16px',
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
              paddingBottom: '8px',
            }}
          >
            ▶ INITIATE WITHDRAWAL
          </div>

          {!primaryWallet?.address ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: '9px', color: '#709ca6', marginBottom: '16px' }}>
                Please connect your EVM / Robinhood Chain wallet to access withdrawals.
              </p>
              <ConnectWalletButton />
            </div>
          ) : (
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                  AMOUNT IN FUEL COINS (Min {minCoins.toLocaleString()})
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min={minCoins}
                    max={bankCoins}
                    value={withdrawCoins}
                    onChange={(e) => setWithdrawCoins(e.target.value)}
                    placeholder={`e.g. ${minCoins}`}
                    required
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'rgba(6, 15, 19, 0.9)',
                      border: '1px solid rgba(0, 255, 135, 0.3)',
                      borderRadius: '6px',
                      color: '#00ff87',
                      fontSize: '10px',
                      fontFamily: "'Press Start 2P', monospace",
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawCoins(String(bankCoins))}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 215, 0, 0.15)',
                      border: '1px solid rgba(255, 215, 0, 0.4)',
                      borderRadius: '6px',
                      color: '#ffd700',
                      fontSize: '8px',
                      fontFamily: "'Press Start 2P', monospace",
                      cursor: 'pointer',
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '8px', color: '#709ca6', marginBottom: '6px' }}>
                  RECIPIENT EVM ADDRESS (Robinhood Chain)
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(6, 15, 19, 0.9)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '6px',
                    color: '#00e5ff',
                    fontSize: '9px',
                    fontFamily: "'Press Start 2P', monospace",
                    outline: 'none',
                  }}
                />
              </div>

              {/* Conversion Estimate Box */}
              <div
                style={{
                  background: 'rgba(6, 15, 19, 0.75)',
                  border: '1px dashed rgba(0, 255, 135, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '8px', color: '#709ca6' }}>YOU WILL RECEIVE:</span>
                <span style={{ fontSize: '11px', color: '#00ff87', fontWeight: 900 }}>
                  {estimatedTokens} {tokenSymbol}
                </span>
              </div>

              {errorMessage && (
                <div
                  style={{
                    background: 'rgba(255, 56, 56, 0.15)',
                    border: '1px solid rgba(255, 56, 56, 0.5)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#ff7979',
                    fontSize: '8px',
                    lineHeight: '1.6',
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    background: 'rgba(0, 255, 135, 0.15)',
                    border: '1px solid rgba(0, 255, 135, 0.5)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#00ff87',
                    fontSize: '8px',
                    lineHeight: '1.6',
                  }}
                >
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || coins < minCoins || coins > bankCoins}
                style={{
                  padding: '12px 24px',
                  background:
                    isLoading || coins < minCoins || coins > bankCoins
                      ? 'rgba(70, 90, 95, 0.4)'
                      : 'linear-gradient(90deg, #00ff87, #00e5ff)',
                  color:
                    isLoading || coins < minCoins || coins > bankCoins ? '#709ca6' : '#060b0e',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  fontFamily: "'Press Start 2P', monospace",
                  cursor:
                    isLoading || coins < minCoins || coins > bankCoins ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 20px rgba(0, 255, 135, 0.3)',
                  transition: 'all 0.2s ease',
                  marginTop: '6px',
                }}
              >
                {isLoading ? 'PROCESSING WITHDRAWAL...' : 'CONFIRM WITHDRAWAL'}
              </button>
            </form>
          )}
        </div>

        {/* Withdrawal History Card */}
        <div
          style={{
            background: 'rgba(10, 20, 24, 0.85)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: '#00e5ff',
              marginBottom: '14px',
              letterSpacing: '1px',
            }}
          >
            📋 RECENT WITHDRAWALS
          </div>

          {history.length === 0 ? (
            <div style={{ fontSize: '8px', color: '#709ca6', textAlign: 'center', padding: '16px' }}>
              No withdrawals on record yet. Play and collect Fuel Coins!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '7.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#709ca6', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>COINS</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>TOKENS</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>STATUS</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>TX</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        color: '#e0f2f1',
                      }}
                    >
                      <td style={{ padding: '8px', color: '#ffd700' }}>
                        ⚡ {tx.amountCoins.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', color: '#00ff87' }}>
                        {tx.tokensPaid} {tokenSymbol}
                      </td>
                      <td style={{ padding: '8px', color: '#00e5ff' }}>
                        {tx.status.toUpperCase()}
                      </td>
                      <td style={{ padding: '8px', color: '#709ca6' }}>
                        {tx.txHash ? `${tx.txHash.slice(0, 8)}...` : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
