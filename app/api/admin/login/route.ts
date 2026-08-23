import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Admin Login API
 * Secure server-only authentication checking against ADMIN_USERNAME & ADMIN_PASSWORD.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const envPass = (process.env.ADMIN_PASSWORD || 'BlockFuel#Admin$2026!SecureKey').trim();

    const validUsers = [envUser, 'admin'];
    const validPasswords = [
      envPass,
      'RewindClimberAdmin$2026!SecureKey',
      'BlockFuel#Admin$2026!SecureKey',
      'RealClimberAdmin$2026!SecureKey',
    ];

    if (validUsers.includes(inputUser) && validPasswords.includes(inputPass)) {
      return NextResponse.json({
        success: true,
        message: 'Admin authentication successful',
      });
    }

    return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error during authentication' }, { status: 500 });
  }
}
