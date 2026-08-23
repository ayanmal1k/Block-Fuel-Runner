/**
 * Centralized Game Settings & Economics System (Client Safe)
 *
 * Provides interface definitions, defaults, and API client fetcher.
 */

export interface GameSettings {
  gameFeeAmount: number;
  minTokenRequired: number;       // Minimum token threshold to play
  coinsPerToken: number;          // Fuel Coins needed per 1 token
  minWithdrawCoins: number;       // Minimum coins threshold to withdraw
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
 * Fetch dynamic game settings from server API endpoint with fallback defaults.
 * Safe for client-side and browser usage (zero direct Firebase dependencies).
 */
export async function getGameSettings(): Promise<GameSettings> {
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
    // Fallback to default values
  }
  return DEFAULT_GAME_SETTINGS;
}
