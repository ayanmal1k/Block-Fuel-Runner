import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getGameSettings } from '@/lib/gameSettings';
import { fetchEvmTokenBalance } from '@/lib/evmBalance';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userAddress, amountCoins, destinationAddress } = body;

    if (!userAddress || typeof userAddress !== 'string') {
      return NextResponse.json({ error: 'Valid userAddress is required' }, { status: 400 });
    }

    const recipient = destinationAddress || userAddress;
    const coinsToExchange = Number(amountCoins);

    // 1. Fetch live game settings
    const settings = await getGameSettings();

    // 2. Validate minimum token balance requirement on Robinhood Chain
    if (settings.minTokenRequired > 0) {
      const { balance } = await fetchEvmTokenBalance(userAddress, settings.tokenAddress, settings.rpcUrl);
      if (balance < settings.minTokenRequired) {
        return NextResponse.json(
          {
            error: `Minimum Balance Required: You must hold at least ${settings.minTokenRequired} tokens on Robinhood Chain to process withdrawals. Your current balance: ${balance}.`,
          },
          { status: 403 }
        );
      }
    }

    // 3. Validate minimum withdraw threshold
    if (isNaN(coinsToExchange) || coinsToExchange < settings.minWithdrawCoins) {
      return NextResponse.json(
        { error: `Minimum withdrawal threshold is ${settings.minWithdrawCoins.toLocaleString()} Fuel Coins` },
        { status: 400 }
      );
    }

    // 4. Verify user bank balance in Firestore
    let currentBankCoins = 0;
    let userRef: any = null;

    if (db && db.type) {
      userRef = doc(db, 'users', userAddress.toLowerCase());
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return NextResponse.json({ error: 'User record not found. Play games to bank Fuel Coins first.' }, { status: 404 });
      }

      const userData = userSnap.data();
      currentBankCoins = Number(userData.totalCoins || 0);

      if (currentBankCoins < coinsToExchange) {
        return NextResponse.json(
          { error: `Insufficient banked coins. You have ${currentBankCoins.toLocaleString()} coins, but requested ${coinsToExchange.toLocaleString()}.` },
          { status: 400 }
        );
      }

      // Deduct coins & update totalWithdrawn
      const remainingCoins = currentBankCoins - coinsToExchange;
      const totalWithdrawn = Number(userData.totalWithdrawn || 0) + coinsToExchange;

      await setDoc(
        userRef,
        {
          totalCoins: remainingCoins,
          totalWithdrawn: totalWithdrawn,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 5. Calculate payout tokens
    const rate = settings.coinsPerToken || 10;
    const tokensPaid = Number((coinsToExchange / rate).toFixed(4));
    const txHash = `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

    // 6. Record withdrawal log in Firestore
    if (db && db.type) {
      await addDoc(collection(db, 'withdrawals'), {
        userAddress: userAddress.toLowerCase(),
        destinationAddress: recipient.toLowerCase(),
        amountCoins: coinsToExchange,
        tokensPaid,
        tokenAddress: settings.tokenAddress,
        chainId: settings.chainId,
        status: 'completed',
        txHash,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal processed successfully',
      coinsDeducted: coinsToExchange,
      tokensPaid,
      txHash,
      recipient,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: error.message || 'Internal error processing withdrawal' }, { status: 500 });
  }
}
