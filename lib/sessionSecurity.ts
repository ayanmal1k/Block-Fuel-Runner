import crypto from 'crypto';

const SECRET = process.env.GAME_SECRET_KEY || 'BlockFuel#GameSecret#2026!DefaultKey';

export interface GameSessionPayload {
  sessionId: string;
  userAddress: string;
  startTime: number;
  nonce: string;
}

// In-memory replay prevention cache for consumed sessions (stores sessionId with expiry)
const consumedSessions = new Map<string, number>();

function cleanConsumedSessions() {
  const now = Date.now();
  for (const [id, expiry] of consumedSessions.entries()) {
    if (now > expiry) {
      consumedSessions.delete(id);
    }
  }
}

/**
 * Creates a cryptographically signed HMAC SHA-256 Game Session Token
 */
export function createGameSessionToken(userAddress: string): {
  sessionToken: string;
  sessionId: string;
  startTime: number;
} {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const startTime = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex');

  const payload: GameSessionPayload = {
    sessionId,
    userAddress: userAddress.toLowerCase(),
    startTime,
    nonce,
  };

  const payloadString = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadString, 'utf-8').toString('base64url');

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sessionToken = `${payloadB64}.${signature}`;

  return {
    sessionToken,
    sessionId,
    startTime,
  };
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  elapsedSeconds?: number;
  sessionData?: GameSessionPayload;
}

/**
 * Verifies the HMAC SHA-256 session token and performs anti-cheat rate validations
 */
export function verifyGameSessionToken(
  sessionToken: string,
  userAddress: string,
  score: number,
  coinsCollected: number
): VerificationResult {
  cleanConsumedSessions();

  if (!sessionToken || typeof sessionToken !== 'string') {
    return { valid: false, error: 'Missing or invalid session token' };
  }

  const parts = sessionToken.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed session token format' };
  }

  const [payloadB64, signature] = parts;

  // 1. Verify HMAC Signature
  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature, 'utf-8');
  const expBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, error: 'Invalid HMAC signature — session token tampered or forged' };
  }

  // 2. Decode and parse payload
  let payload: GameSessionPayload;
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    payload = JSON.parse(json);
  } catch {
    return { valid: false, error: 'Unable to decode session payload' };
  }

  // 3. Replay Protection: ensure session hasn't already been consumed
  if (consumedSessions.has(payload.sessionId)) {
    return { valid: false, error: 'Game session already completed and consumed (Replay attack blocked)' };
  }

  // 4. Validate user address match
  if (payload.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
    return { valid: false, error: 'Wallet address mismatch for this session token' };
  }

  // 5. Elapsed time validation
  const now = Date.now();
  const elapsedMs = now - payload.startTime;
  const elapsedSeconds = Math.max(0, elapsedMs / 1000);

  // Reject sessions shorter than 1 second
  if (elapsedSeconds < 1.0) {
    return { valid: false, error: 'Game session ended too quickly (minimum 1 second required)' };
  }

  // Reject expired sessions older than 2 hours
  if (elapsedSeconds > 7200) {
    return { valid: false, error: 'Game session expired (> 2 hours)' };
  }

  // 6. Anti-Cheat: Validate max coins rate vs elapsed time
  // Game spawns 1 coin every 3-5 seconds. Allow up to 3 coins/sec max threshold.
  const maxPossibleCoins = Math.ceil(elapsedSeconds * 3.0) + 3;
  if (coinsCollected > maxPossibleCoins) {
    return {
      valid: false,
      error: `Abnormal coin collection rate: ${coinsCollected} coins in ${elapsedSeconds.toFixed(1)}s (max possible: ${maxPossibleCoins})`,
    };
  }

  // 7. Anti-Cheat: Validate max score rate vs elapsed time
  // Maximum score rate (dodging + punching mites/aeros) is ~25 points/sec max.
  const maxPossibleScore = Math.ceil(elapsedSeconds * 30) + 15;
  if (score > maxPossibleScore) {
    return {
      valid: false,
      error: `Abnormal score rate: ${score} points in ${elapsedSeconds.toFixed(1)}s (max possible: ${maxPossibleScore})`,
    };
  }

  // Mark session as consumed (keep for 2 hours in memory)
  consumedSessions.set(payload.sessionId, now + 7200 * 1000);

  return {
    valid: true,
    elapsedSeconds,
    sessionData: payload,
  };
}
