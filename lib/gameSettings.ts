/**
 * Centralized Game Settings & Economics System (Server & Shared)
 *
 * Parameters are managed via Firestore `settings/game_config` and Next.js API.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface GameSettings {
  gameFeeAmount: number;
  minTokenRequired: number;       // Minimum token threshold to play / withdraw
  coinsPerToken: number;          // Fuel Coins needed per 1 token (e.g. 10 coins = 1 token)
  minWithdrawCoins: number;       // Minimum coins threshold to withdraw (e.g. 100)
  tokenAddress: string;           // ERC-20 contract address on Robinhood Chain
  chainId: number;                // Robinhood Chain EVM ID
  rpcUrl: string;                 // EVM RPC URL
  leaderboardEnabled: boolean;
  maintenanceMode: boolean;
  startDate: string;
  endDate: string;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gameFeeAmount: 0,
  minTokenRequired: 0,
  coinsPerToken: 10,
  minWithdrawCoins: 100,
  tokenAddress: '0x020bfC650A365f8BB26819deAAbF3E21291018b4',
  chainId: Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 4663),
  rpcUrl: process.env.NEXT_PUBLIC_EVM_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
  leaderboardEnabled: true,
  maintenanceMode: false,
  startDate: '',
  endDate: '',
};

/**
 * Fetch dynamic game settings with fallback defaults.
 * Automatically handles client-side API requests and server-side direct Firestore queries.
 */
export async function getGameSettings(): Promise<GameSettings> {
  // If running in browser, fetch settings from API route
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        return {
          ...DEFAULT_GAME_SETTINGS,
          ...data,
        };
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_GAME_SETTINGS;
  }

  // Server-side Firestore access
  try {
    if (!db || !db.type) {
      return DEFAULT_GAME_SETTINGS;
    }
    const configRef = doc(db, 'settings', 'game_config');
    const snap = await getDoc(configRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        gameFeeAmount: typeof data.gameFeeAmount === 'number' ? data.gameFeeAmount : DEFAULT_GAME_SETTINGS.gameFeeAmount,
        minTokenRequired: typeof data.minTokenRequired === 'number' ? data.minTokenRequired : DEFAULT_GAME_SETTINGS.minTokenRequired,
        coinsPerToken: typeof data.coinsPerToken === 'number' && data.coinsPerToken > 0 ? data.coinsPerToken : DEFAULT_GAME_SETTINGS.coinsPerToken,
        minWithdrawCoins: typeof data.minWithdrawCoins === 'number' && data.minWithdrawCoins >= 0 ? data.minWithdrawCoins : DEFAULT_GAME_SETTINGS.minWithdrawCoins,
        tokenAddress: data.tokenAddress || DEFAULT_GAME_SETTINGS.tokenAddress,
        chainId: typeof data.chainId === 'number' ? data.chainId : DEFAULT_GAME_SETTINGS.chainId,
        rpcUrl: data.rpcUrl || DEFAULT_GAME_SETTINGS.rpcUrl,
        leaderboardEnabled: data.leaderboardEnabled !== undefined ? Boolean(data.leaderboardEnabled) : DEFAULT_GAME_SETTINGS.leaderboardEnabled,
        maintenanceMode: data.maintenanceMode !== undefined ? Boolean(data.maintenanceMode) : DEFAULT_GAME_SETTINGS.maintenanceMode,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
      };
    }

    // Initialize document in Firestore if not existing
    try {
      await setDoc(configRef, {
        ...DEFAULT_GAME_SETTINGS,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Quietly ignore if write fails
    }

    return DEFAULT_GAME_SETTINGS;
  } catch (err) {
    console.error('Error loading game settings from Firestore:', err);
    return DEFAULT_GAME_SETTINGS;
  }
}
