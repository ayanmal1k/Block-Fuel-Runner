import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!db || !db.type) {
      return NextResponse.json({ withdrawals: [], players: [] });
    }

    // Fetch withdrawals
    const wSnap = await getDocs(collection(db, 'withdrawals'));
    const wList: any[] = [];
    wSnap.forEach((d) => wList.push({ id: d.id, ...d.data() }));
    const sortedWithdrawals = wList.reverse();

    // Fetch players
    const uSnap = await getDocs(collection(db, 'users'));
    const uList: any[] = [];
    uSnap.forEach((d) => uList.push({ id: d.id, ...d.data() }));
    uList.sort((a, b) => (b.highScore || 0) - (a.highScore || 0));

    return NextResponse.json({
      withdrawals: sortedWithdrawals,
      players: uList,
    });
  } catch (error: any) {
    console.error('Error fetching admin data:', error);
    return NextResponse.json({ error: 'Failed to fetch admin data', withdrawals: [], players: [] }, { status: 500 });
  }
}
