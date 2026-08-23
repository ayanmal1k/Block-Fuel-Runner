/**
 * Centralized Game Settings & Economics System (Server & Shared)
 *
 * All parameters are stored in Firestore `settings/game_config` so the
 * Admin can update them dynamically in real-time without redeployment.
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
  gameFeeAmount: Number(process.env.GAME_FEE_AMOUNT || process.env.NEXT_PUBLIC_GAME_FEE_AMOUNT || 0),
  minTokenRequired: Number(process.env.NEXT_PUBLIC_MIN_TOKEN_REQUIRED || process.env.MIN_TOKEN_REQUIRED || 10),
  coinsPerToken: Number(process.env.NEXT_PUBLIC_COINS_PER_TOKEN || 10),
  minWithdrawCoins: Number(process.env.NEXT_PUBLIC_MIN_WITHDRAW_COINS || 100),
  tokenAddress: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  chainId: Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 10001),
  rpcUrl: process.env.NEXT_PUBLIC_EVM_RPC_URL || 'https://rpc.robinhood-chain.com',
  leaderboardEnabled: true,
  maintenanceMode: false,
  startDate: '',
  endDate: '',
};

/**
 * Fetch dynamic game settings from Firestore with fallback defaults.
 */
export async function getGameSettings(): Promise<GameSettings> {
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
