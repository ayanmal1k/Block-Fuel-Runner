import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { verifyGameSessionToken } from '@/lib/sessionSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionToken, userAddress, score, coinsCollected } = body;

    if (!userAddress || typeof userAddress !== 'string') {
      return NextResponse.json({ error: 'Valid userAddress is required' }, { status: 400 });
    }

    const earnedCoins = Math.max(0, Number(coinsCollected) || 0);
    const finalScore = Math.max(0, Number(score) || 0);

    // 1. Verify HMAC SHA-256 Session Signature & Anti-Cheat validation
    const verification = verifyGameSessionToken(sessionToken, userAddress, finalScore, earnedCoins);
    if (!verification.valid) {
      console.warn(`[Security Alert] Rejected game session for ${userAddress}: ${verification.error}`);
      return NextResponse.json(
        { error: `Security check failed: ${verification.error}` },
        { status: 403 }
      );
    }

    const verifiedDuration = Math.round(verification.elapsedSeconds || 0);

    let updatedHighScore = finalScore;
    let newTotalCoins = earnedCoins;

    // 2. Persist to Firestore
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

      // Record Game Session Log with verified duration and session ID
      await addDoc(collection(db, 'game_sessions'), {
        sessionId: verification.sessionData?.sessionId || 'unknown',
        userAddress: userAddress.toLowerCase(),
        score: finalScore,
        coinsCollected: earnedCoins,
        durationSeconds: verifiedDuration,
        verified: true,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      highScore: updatedHighScore,
      totalCoins: newTotalCoins,
      coinsAdded: earnedCoins,
      durationSeconds: verifiedDuration,
    });
  } catch (error: any) {
    console.error('Game end session error:', error);
    return NextResponse.json({ error: 'Failed to record game session' }, { status: 500 });
  }
}
