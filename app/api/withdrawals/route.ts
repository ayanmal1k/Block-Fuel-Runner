import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress')?.toLowerCase().trim();

    if (!userAddress) {
      return NextResponse.json({ history: [] });
    }

    if (!db || !db.type) {
      return NextResponse.json({ history: [] });
    }

    const q = query(
      collection(db, 'withdrawals'),
      where('userAddress', '==', userAddress),
      limit(15)
    );

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ history: list });
  } catch (error: any) {
    console.error('Error fetching withdrawal history:', error);
    return NextResponse.json({ history: [], error: 'Failed to fetch history' }, { status: 500 });
  }
}
