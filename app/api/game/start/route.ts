import { NextResponse } from 'next/server';
import { createGameSessionToken } from '@/lib/sessionSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userAddress } = body;

    if (!userAddress || typeof userAddress !== 'string') {
      return NextResponse.json({ error: 'Valid userAddress is required to start a game session' }, { status: 400 });
    }

    const session = createGameSessionToken(userAddress);

    return NextResponse.json({
      success: true,
      sessionToken: session.sessionToken,
      sessionId: session.sessionId,
      startTime: session.startTime,
    });
  } catch (error: any) {
    console.error('Error creating game session:', error);
    return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
  }
}
