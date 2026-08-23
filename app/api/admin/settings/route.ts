import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_GAME_SETTINGS } from '@/lib/gameSettings';
import { getServerGameSettings } from '@/lib/serverGameSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getServerGameSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      gameFeeAmount,
      minTokenRequired,
      coinsPerToken,
      minWithdrawCoins,
      tokenAddress,
      chainId,
      rpcUrl,
      leaderboardEnabled,
      maintenanceMode,
      startDate,
      endDate,
    } = body;

    const updatedSettings = {
      gameFeeAmount: typeof gameFeeAmount === 'number' && gameFeeAmount >= 0 ? gameFeeAmount : Number(gameFeeAmount) || DEFAULT_GAME_SETTINGS.gameFeeAmount,
      minTokenRequired: typeof minTokenRequired === 'number' && minTokenRequired >= 0 ? minTokenRequired : Number(minTokenRequired) || 0,
      coinsPerToken: typeof coinsPerToken === 'number' && coinsPerToken > 0 ? coinsPerToken : Number(coinsPerToken) || DEFAULT_GAME_SETTINGS.coinsPerToken,
      minWithdrawCoins: typeof minWithdrawCoins === 'number' && minWithdrawCoins >= 0 ? minWithdrawCoins : Number(minWithdrawCoins) || DEFAULT_GAME_SETTINGS.minWithdrawCoins,
      tokenAddress: tokenAddress || DEFAULT_GAME_SETTINGS.tokenAddress,
      chainId: typeof chainId === 'number' ? chainId : Number(chainId) || DEFAULT_GAME_SETTINGS.chainId,
      rpcUrl: rpcUrl || DEFAULT_GAME_SETTINGS.rpcUrl,
      leaderboardEnabled: leaderboardEnabled !== undefined ? Boolean(leaderboardEnabled) : DEFAULT_GAME_SETTINGS.leaderboardEnabled,
      maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : DEFAULT_GAME_SETTINGS.maintenanceMode,
      startDate: startDate || '',
      endDate: endDate || '',
      updatedAt: serverTimestamp(),
    };

    if (db && db.type) {
      const configRef = doc(db, 'settings', 'game_config');
      await setDoc(configRef, updatedSettings, { merge: true });
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
