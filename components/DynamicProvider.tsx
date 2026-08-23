'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { fetchEvmTokenBalance, getRobinhoodRpcList } from '@/lib/evmBalance';
import { getGameSettings, GameSettings, DEFAULT_GAME_SETTINGS } from '@/lib/gameSettings';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export interface WalletContextType {
  primaryWallet: { address: string } | null;
  setShowAuthFlow: (show: boolean) => void;
  handleLogOut: () => Promise<void>;
  connectNativeEVM: () => Promise<void>;
  walletError: string | null;
  tokenBalance: number;
  tokenSymbol: string;
  isCheckingBalance: boolean;
  isEligible: boolean;
  minTokenRequired: number;
  bankCoins: number;
  gameSettings: GameSettings;
  refetchBalance: () => Promise<void>;
  refreshBankCoins: () => Promise<void>;
  isAuthenticated: boolean;
}

const WalletContext = createContext<WalletContextType>({
  primaryWallet: null,
  setShowAuthFlow: () => {},
  handleLogOut: async () => {},
  connectNativeEVM: async () => {},
  walletError: null,
  tokenBalance: 0,
  tokenSymbol: 'FUEL',
  isCheckingBalance: false,
  isEligible: true,
  minTokenRequired: 0,
  bankCoins: 0,
  gameSettings: DEFAULT_GAME_SETTINGS,
  refetchBalance: async () => {},
  refreshBankCoins: async () => {},
  isAuthenticated: false,
});

export const useWallet = () => useContext(WalletContext);

function DynamicWalletBridge({ children }: { children: React.ReactNode }) {
  const [nativeAddress, setNativeAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('FUEL');
  const [isCheckingBalance, setIsCheckingBalance] = useState<boolean>(false);
  const [bankCoins, setBankCoins] = useState<number>(0);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);

  // Dynamic context
  let dynamicWalletAddress: string | null = null;
  let dynamicSetShowAuthFlow: ((show: boolean) => void) | null = null;
  let dynamicHandleLogOut: (() => Promise<void>) | null = null;

  try {
    const dyn = useDynamicContext();
    if (dyn?.primaryWallet?.address) {
      dynamicWalletAddress = dyn.primaryWallet.address;
    }
    if (dyn?.setShowAuthFlow) {
      dynamicSetShowAuthFlow = dyn.setShowAuthFlow;
    }
    if (dyn?.handleLogOut) {
      dynamicHandleLogOut = dyn.handleLogOut;
    }
  } catch {
    // Dynamic context not loaded or disabled
  }

  const effectiveAddress = dynamicWalletAddress || nativeAddress;

  // Fetch dynamic settings from Firestore
  useEffect(() => {
    getGameSettings().then(setGameSettings);
  }, []);

  // Restore fallback wallet from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('block_fuel_evm_wallet');
    if (saved && !dynamicWalletAddress) {
      setNativeAddress(saved);
    }
  }, [dynamicWalletAddress]);

  // Connect via window.ethereum (MetaMask / Robinhood / Rabby browser extension)
  const connectNativeEVM = useCallback(async () => {
    try {
      setWalletError(null);
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts && accounts[0]) {
          setNativeAddress(accounts[0]);
          localStorage.setItem('block_fuel_evm_wallet', accounts[0]);
        }
      } else {
        // Mock connection for test environment
        const mockAddr = `0x71C${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-6)}`;
        setNativeAddress(mockAddr);
        localStorage.setItem('block_fuel_evm_wallet', mockAddr);
      }
    } catch (err: any) {
      console.error('Error connecting EVM wallet:', err);
      setWalletError(err.message || 'Failed to connect EVM wallet');
    }
  }, []);

  // Handle logout
  const handleLogOut = useCallback(async () => {
    if (dynamicHandleLogOut) {
      try {
        await dynamicHandleLogOut();
      } catch {}
    }
    setNativeAddress(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('block_fuel_evm_wallet');
    }
    setBankCoins(0);
    setTokenBalance(0);
  }, [dynamicHandleLogOut]);

  const setShowAuthFlow = useCallback(
    (show: boolean) => {
      if (dynamicSetShowAuthFlow) {
        dynamicSetShowAuthFlow(show);
      } else {
        connectNativeEVM();
      }
    },
    [dynamicSetShowAuthFlow, connectNativeEVM]
  );

  // Refetch token balance on Robinhood Chain
  const refetchBalance = useCallback(async () => {
    if (!effectiveAddress) {
      setTokenBalance(0);
      return;
    }
    setIsCheckingBalance(true);
    try {
      const res = await fetchEvmTokenBalance(effectiveAddress, gameSettings.tokenAddress, gameSettings.rpcUrl);
      setTokenBalance(res.balance);
      setTokenSymbol(res.symbol);
    } catch (err) {
      console.error('Failed to refetch EVM balance:', err);
    } finally {
      setIsCheckingBalance(false);
    }
  }, [effectiveAddress, gameSettings.tokenAddress, gameSettings.rpcUrl]);

  // Refresh banked fuel coins from Firestore
  const refreshBankCoins = useCallback(async () => {
    if (!effectiveAddress || !db || !db.type) return;
    try {
      const userRef = doc(db, 'users', effectiveAddress.toLowerCase());
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setBankCoins(Number(data.totalCoins || 0));
      } else {
        // Initialize user in Firestore
        await setDoc(userRef, {
          address: effectiveAddress.toLowerCase(),
          totalCoins: 0,
          highScore: 0,
          totalWithdrawn: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setBankCoins(0);
      }
    } catch (err) {
      console.warn('Firestore user fetch note:', err);
    }
  }, [effectiveAddress]);

  // Real-time listener for user banked coins in Firestore
  useEffect(() => {
    if (!effectiveAddress || !db || !db.type) return;
    refetchBalance();
    refreshBankCoins();

    try {
      const userRef = doc(db, 'users', effectiveAddress.toLowerCase());
      const unsub = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setBankCoins(Number(docSnap.data().totalCoins || 0));
        }
      });
      return () => unsub();
    } catch {
      // Fallback
    }
  }, [effectiveAddress, refetchBalance, refreshBankCoins]);

  // Catch unhandled Dynamic API fetch rejections gracefully
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (
        e.reason?.message?.includes('Failed to fetch') ||
        e.reason?.stack?.includes('SDKApi') ||
        e.reason?.stack?.includes('BaseAPI')
      ) {
        e.preventDefault();
        console.warn('Dynamic API fetch note: continuing with direct EVM provider.');
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  const minRequired = gameSettings.minTokenRequired || 0;
  const isEligible = minRequired <= 0 || tokenBalance >= minRequired;

  const value: WalletContextType = {
    primaryWallet: effectiveAddress ? { address: effectiveAddress } : null,
    setShowAuthFlow,
    handleLogOut,
    connectNativeEVM,
    walletError,
    tokenBalance,
    tokenSymbol,
    isCheckingBalance,
    isEligible,
    minTokenRequired: minRequired,
    bankCoins,
    gameSettings,
    refetchBalance,
    refreshBankCoins,
    isAuthenticated: !!effectiveAddress,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

class DynamicErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('Dynamic SDK unavailable (using direct browser EVM connector):', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDynamicEnvId(id?: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed);
}

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const dynamicEnvId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

  // Custom EVM Network for Robinhood Mainnet
  const customEvmNetworks = [
    {
      blockExplorerUrls: [process.env.NEXT_PUBLIC_EVM_EXPLORER_URL || 'https://explorer.robinhood-chain.com'],
      chainId: Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 10001),
      chainName: process.env.NEXT_PUBLIC_EVM_CHAIN_NAME || 'Robinhood Mainnet',
      iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
      name: 'Robinhood Mainnet',
      nativeCurrency: {
        decimals: 18,
        name: process.env.NEXT_PUBLIC_EVM_NATIVE_SYMBOL || 'ROBIN',
        symbol: process.env.NEXT_PUBLIC_EVM_NATIVE_SYMBOL || 'ROBIN',
      },
      networkId: Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 10001),
      rpcUrls: getRobinhoodRpcList(),
      vanityName: 'Robinhood Mainnet',
    },
  ];

  if (!isValidDynamicEnvId(dynamicEnvId)) {
    return <DynamicWalletBridge>{children}</DynamicWalletBridge>;
  }

  return (
    <DynamicErrorBoundary fallback={<DynamicWalletBridge>{children}</DynamicWalletBridge>}>
      <DynamicContextProvider
        settings={{
          environmentId: dynamicEnvId!,
          walletConnectors: [EthereumWalletConnectors],
          overrides: {
            evmNetworks: customEvmNetworks,
          },
        }}
      >
        <DynamicWalletBridge>{children}</DynamicWalletBridge>
      </DynamicContextProvider>
    </DynamicErrorBoundary>
  );
}
