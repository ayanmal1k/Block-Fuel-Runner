import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userAddress, score, coinsCollected, durationSeconds } = body;

    if (!userAddress || typeof userAddress !== 'string') {
      return NextResponse.json({ error: 'Valid userAddress is required' }, { status: 400 });
    }

    const earnedCoins = Math.max(0, Number(coinsCollected) || 0);
    const finalScore = Math.max(0, Number(score) || 0);

    let updatedHighScore = finalScore;
    let newTotalCoins = earnedCoins;

    if (db && db.type) {
      const userRef = doc(db, 'users', userAddress.toLowerCase());
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const currentHi = Number(data.highScore || 0);
        const currentCoins = Number(data.totalCoins || 0);

        updatedHighScore = Math.max(currentHi, finalScore);
        newTotalCoins = currentCoins + earnedCoins;

        await setDoc(
          userRef,
          {
            highScore: updatedHighScore,
            totalCoins: newTotalCoins,
            lastPlayed: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(userRef, {
          address: userAddress.toLowerCase(),
          highScore: finalScore,
          totalCoins: earnedCoins,
          totalWithdrawn: 0,
          createdAt: serverTimestamp(),
          lastPlayed: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Record Game Session Log
      await addDoc(collection(db, 'game_sessions'), {
        userAddress: userAddress.toLowerCase(),
        score: finalScore,
        coinsCollected: earnedCoins,
        durationSeconds: Number(durationSeconds) || 0,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      highScore: updatedHighScore,
      totalCoins: newTotalCoins,
      coinsAdded: earnedCoins,
    });
  } catch (error: any) {
    console.error('Game end session error:', error);
    return NextResponse.json({ error: 'Failed to record game session' }, { status: 500 });
  }
}
