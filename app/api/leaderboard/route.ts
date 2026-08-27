import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getServerGameSettings } from '@/lib/serverGameSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getServerGameSettings();

    // Check if leaderboard is enabled by admin
    if (!settings.leaderboardEnabled) {
      return NextResponse.json({
        enabled: false,
        players: [],
        message: 'Leaderboard is currently disabled by administrator.',
      });
    }

    if (!db || !db.type) {
      return NextResponse.json({
        enabled: true,
        players: [],
      });
    }

    // Fetch players from Firestore
    const uSnap = await getDocs(collection(db, 'users'));
    const uList: any[] = [];
    uSnap.forEach((d) => {
      const data = d.data();
      uList.push({
        id: d.id,
        address: data.address || d.id,
        highScore: Number(data.highScore || 0),
        totalCoins: Number(data.totalCoins || 0),
        lastPlayed: data.lastPlayed || data.updatedAt || null,
      });
    });

    // Sort descending by high score, then by total coins
    uList.sort((a, b) => {
      if (b.highScore !== a.highScore) {
        return b.highScore - a.highScore;
      }
      return b.totalCoins - a.totalCoins;
    });

    // Return top 50 players
    const topPlayers = uList.slice(0, 50);

    return NextResponse.json({
      enabled: true,
      players: topPlayers,
      totalPlayers: uList.length,
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data', enabled: false, players: [] },
      { status: 500 }
    );
  }
}
