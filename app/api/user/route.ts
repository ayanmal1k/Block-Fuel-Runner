import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase().trim();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!db || !db.type) {
      return NextResponse.json({ totalCoins: 0, highScore: 0, totalWithdrawn: 0 });
    }

    const userRef = doc(db, 'users', address);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      return NextResponse.json({
        totalCoins: Number(data.totalCoins || 0),
        highScore: Number(data.highScore || 0),
        totalWithdrawn: Number(data.totalWithdrawn || 0),
      });
    }

    // Initialize user record if not exists
    const newUser = {
      address,
      totalCoins: 0,
      highScore: 0,
      totalWithdrawn: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newUser);
    } catch {
      // Quietly ignore if set fails
    }

    return NextResponse.json({
      totalCoins: 0,
      highScore: 0,
      totalWithdrawn: 0,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
