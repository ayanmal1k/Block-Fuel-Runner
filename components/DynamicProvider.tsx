'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { fetchEvmTokenBalance, getRobinhoodRpcList } from '@/lib/evmBalance';
import { getGameSettings, GameSettings, DEFAULT_GAME_SETTINGS } from '@/lib/gameSettings';

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
export const useAppWallet = useWallet;

function DynamicWalletBridge({ children }: { children: React.ReactNode }) {
  const [nativeAddress, setNativeAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('BLKFUEL');
  const [isCheckingBalance, setIsCheckingBalance] = useState<boolean>(false);
  const [bankCoins, setBankCoins] = useState<number>(0);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);

  // Dynamic context
  let dynamicWalletAddress: string | null = null;
  let dynamicSetShowAuthFlow: ((show: boolean) => void) | null = null;
  let dynamicHandleLogOut: (() => Promise<void>) | null = null;
  let dynContext: any = null;

  try {
    const dyn = useDynamicContext();
    dynContext = dyn;
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
    // Dynamic context fallback
  }

  const targetChainId = Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 4663);

  // Auto-switch Dynamic connected wallet to Robinhood Mainnet if on testnet or another network
  useEffect(() => {
    if (!dynContext?.primaryWallet) return;
    const wallet = dynContext.primaryWallet;
    
    const checkAndSwitchNetwork = async () => {
      try {
        const currentNetwork = wallet.network || wallet.chainId;
        if (currentNetwork && Number(currentNetwork) !== targetChainId) {
          if (typeof wallet.switchNetwork === 'function') {
            await wallet.switchNetwork(targetChainId);
          } else if (typeof wallet.connector?.switchNetwork === 'function') {
            await wallet.connector.switchNetwork({ networkChainId: targetChainId });
          }
        }
      } catch (err) {
        console.warn('Network auto-switch check note:', err);
      }
    };

    checkAndSwitchNetwork();
  }, [dynContext?.primaryWallet, targetChainId]);

  // Restore fallback wallet from localStorage only if Dynamic is not managing session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (dynamicSetShowAuthFlow) return;

    const saved = localStorage.getItem('block_fuel_evm_wallet');
    if (saved && !dynamicWalletAddress) {
      setNativeAddress(saved);
    }
  }, [dynamicSetShowAuthFlow, dynamicWalletAddress]);

  const effectiveAddress = dynamicWalletAddress || nativeAddress;

  // Real-time listener for dynamic game settings from Firestore
  useEffect(() => {
    if (!db || !db.type) {
      getGameSettings().then(setGameSettings);
      return;
    }
    try {
      const configRef = doc(db, 'settings', 'game_config');
      const unsub = onSnapshot(
        configRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setGameSettings({
              gameFeeAmount: typeof data.gameFeeAmount === 'number' ? data.gameFeeAmount : 0,
              minTokenRequired: typeof data.minTokenRequired === 'number' ? data.minTokenRequired : 0,
              coinsPerToken: typeof data.coinsPerToken === 'number' && data.coinsPerToken > 0 ? data.coinsPerToken : 10,
              minWithdrawCoins: typeof data.minWithdrawCoins === 'number' && data.minWithdrawCoins >= 0 ? data.minWithdrawCoins : 100,
              tokenAddress: data.tokenAddress || '0x020bfC650A365f8BB26819deAAbF3E21291018b4',
              chainId: typeof data.chainId === 'number' ? data.chainId : 4663,
              rpcUrl: data.rpcUrl || 'https://rpc.mainnet.chain.robinhood.com',
              leaderboardEnabled: data.leaderboardEnabled !== undefined ? Boolean(data.leaderboardEnabled) : true,
              maintenanceMode: data.maintenanceMode !== undefined ? Boolean(data.maintenanceMode) : false,
              startDate: data.startDate || '',
              endDate: data.endDate || '',
            });
          } else {
            getGameSettings().then(setGameSettings);
          }
        },
        (err) => {
          console.warn('Game settings listener note:', err);
          getGameSettings().then(setGameSettings);
        }
      );
      return () => unsub();
    } catch {
      getGameSettings().then(setGameSettings);
    }
  }, []);

  // Connect native browser fallback with Robinhood Mainnet switch/add
  const connectNativeEVM = useCallback(async () => {
    if (dynamicSetShowAuthFlow) {
      dynamicSetShowAuthFlow(true);
      return;
    }
    try {
      setWalletError(null);
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({
          method: 'eth_requestAccounts',
        });
        
        // Ensure connected to Robinhood Mainnet (4663 / 0x1237)
        const hexChainId = `0x${targetChainId.toString(16)}`;
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          });
        } catch (switchError: any) {
          if (switchError?.code === 4902 || switchError?.data?.originalError?.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hexChainId,
                  chainName: process.env.NEXT_PUBLIC_EVM_CHAIN_NAME || 'Robinhood Chain',
                  nativeCurrency: {
                    name: 'Ether',
                    symbol: process.env.NEXT_PUBLIC_EVM_NATIVE_SYMBOL || 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: getRobinhoodRpcList(),
                  blockExplorerUrls: [process.env.NEXT_PUBLIC_EVM_EXPLORER_URL || 'https://robinhoodchain.blockscout.com'],
                },
              ],
            });
          }
        }

        if (accounts && accounts[0]) {
          setNativeAddress(accounts[0]);
          localStorage.setItem('block_fuel_evm_wallet', accounts[0]);
        }
      } else {
        const mockAddr = `0x71C${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-6)}`;
        setNativeAddress(mockAddr);
        localStorage.setItem('block_fuel_evm_wallet', mockAddr);
      }
    } catch (err: any) {
      console.warn('Native wallet connection note:', err);
      setWalletError(err.message || 'Connection cancelled');
    }
  }, [dynamicSetShowAuthFlow, targetChainId]);

  // Handle logout
  const handleLogOut = useCallback(async () => {
    if (dynamicHandleLogOut) {
      try {
        await dynamicHandleLogOut();
      } catch (e) {
        console.warn('Dynamic logout note:', e);
      }
    }
    setNativeAddress(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('block_fuel_evm_wallet');
    }
    setBankCoins(0);
    setTokenBalance(0);
  }, [dynamicHandleLogOut]);

  // Open native Dynamic modal
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

  // Refetch token balance on Robinhood Chain Mainnet
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

  // Refresh banked fuel coins via secure server API
  const refreshBankCoins = useCallback(async () => {
    if (!effectiveAddress) return;
    try {
      const res = await fetch(`/api/user?address=${encodeURIComponent(effectiveAddress)}`);
      if (res.ok) {
        const data = await res.json();
        setBankCoins(Number(data.totalCoins || 0));
      }
    } catch (err) {
      console.warn('Bank coins fetch note:', err);
    }
  }, [effectiveAddress]);

  // Periodic & event-based update for user balance and banked coins
  useEffect(() => {
    if (!effectiveAddress) return;
    refetchBalance();
    refreshBankCoins();

    const interval = setInterval(() => {
      refreshBankCoins();
    }, 15000);

    return () => clearInterval(interval);
  }, [effectiveAddress, refetchBalance, refreshBankCoins]);

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

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const dynamicEnvId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  const chainId = Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 4663);

  // Custom EVM Network configuration for Robinhood Mainnet
  const customEvmNetworks = [
    {
      blockExplorerUrls: [process.env.NEXT_PUBLIC_EVM_EXPLORER_URL || 'https://robinhoodchain.blockscout.com'],
      chainId: chainId,
      chainName: process.env.NEXT_PUBLIC_EVM_CHAIN_NAME || 'Robinhood Chain',
      iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
      name: 'Robinhood Chain',
      nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: process.env.NEXT_PUBLIC_EVM_NATIVE_SYMBOL || 'ETH',
      },
      networkId: chainId,
      rpcUrls: getRobinhoodRpcList(),
      vanityName: 'Robinhood Chain',
    },
  ];

  if (!dynamicEnvId || dynamicEnvId === 'YOUR_DYNAMIC_ENVIRONMENT_ID') {
    return <DynamicWalletBridge>{children}</DynamicWalletBridge>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: dynamicEnvId,
        walletConnectors: [EthereumWalletConnectors],
        initialAuthenticationMode: 'connect-only',
        networkValidationMode: 'always',
        overrides: {
          evmNetworks: (dashboardNetworks) => [
            ...customEvmNetworks,
            ...(dashboardNetworks || []).filter(
              (n: any) => n.chainId !== 46630 && n.chainId !== 10001 && n.chainId !== chainId
            ),
          ],
        },
      }}
    >
      <DynamicWalletBridge>{children}</DynamicWalletBridge>
    </DynamicContextProvider>
  );
}
