import { createPublicClient, fallback, http, formatUnits, erc20Abi, isAddress } from 'viem';
import { DEFAULT_GAME_SETTINGS } from './gameSettings';

/**
 * Public Robinhood Chain Mainnet RPC endpoints
 */
export const ROBINHOOD_PUBLIC_RPCS: string[] = [
  'https://rpc.mainnet.chain.robinhood.com',
  'https://rpc.mainnet.robinhood.com',
  'https://mainnet.chain.robinhood.com',
  'https://robinhoodchain-rpc.publicnode.com',
  'https://rpc.ankr.com/robinhood',
];

export function getRobinhoodRpcList(customRpc?: string): string[] {
  const list: string[] = [];
  if (customRpc && customRpc.startsWith('http')) list.push(customRpc);
  if (process.env.NEXT_PUBLIC_EVM_RPC_URL && process.env.NEXT_PUBLIC_EVM_RPC_URL.startsWith('http')) {
    if (!list.includes(process.env.NEXT_PUBLIC_EVM_RPC_URL)) {
      list.push(process.env.NEXT_PUBLIC_EVM_RPC_URL);
    }
  }
  for (const rpc of ROBINHOOD_PUBLIC_RPCS) {
    if (!list.includes(rpc)) list.push(rpc);
  }
  return list;
}

/**
 * Fetch on-chain token balance or native balance on Robinhood Chain / EVM with multi-RPC fallback
 */
export async function fetchEvmTokenBalance(
  walletAddress: string,
  tokenContractAddress?: string,
  rpcUrl?: string
): Promise<{ balance: number; raw: bigint; symbol: string }> {
  try {
    if (!walletAddress || !isAddress(walletAddress as `0x${string}`)) {
      return { balance: 0, raw: BigInt(0), symbol: 'FUEL' };
    }

    const rpcList = getRobinhoodRpcList(rpcUrl);
    const effectiveToken = tokenContractAddress || process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || DEFAULT_GAME_SETTINGS.tokenAddress;

    const transports = rpcList.map((url) =>
      http(url, {
        timeout: 6000,
        retryCount: 1,
      })
    );

    const publicClient = createPublicClient({
      transport: fallback(transports, { rank: false }),
    });

    // If zero-address or not specified, fetch native gas coin balance
    if (!effectiveToken || effectiveToken === '0x0000000000000000000000000000000000000000') {
      const nativeBalance = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      const formatted = parseFloat(formatUnits(nativeBalance, 18));
      return {
        balance: formatted,
        raw: nativeBalance,
        symbol: process.env.NEXT_PUBLIC_EVM_NATIVE_SYMBOL || 'ROBIN',
      };
    }

    // Otherwise fetch ERC-20 token balance
    const [rawBalance, decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: effectiveToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: effectiveToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      }).catch(() => 18),
      publicClient.readContract({
        address: effectiveToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      }).catch(() => 'BLKFUEL'),
    ]);

    const formatted = parseFloat(formatUnits(rawBalance, decimals));
    return {
      balance: formatted,
      raw: rawBalance,
      symbol: symbol || 'BLKFUEL',
    };
  } catch (error) {
    console.warn('Error querying EVM token balance:', error);
    // Graceful fallback for local test/demo
    return { balance: 0, raw: BigInt(0), symbol: 'BLKFUEL' };
  }
}
