import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { GameSettings, DEFAULT_GAME_SETTINGS } from '@/lib/gameSettings';

/**
 * Server-only helper to read/write game settings directly from Firestore.
 * Never import this file in client components.
 */
export async function getServerGameSettings(): Promise<GameSettings> {
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
