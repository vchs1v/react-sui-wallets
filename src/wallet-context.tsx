import type { MoveCallTransaction, TransactionResponse, SuiAddress } from '@mysten/sui.js';
import React, { createContext, useContext, useRef, useCallback, useState, useEffect, FC, ReactNode } from 'react';
import { WalletNotConnectedError } from './errors';
import { useUpdateEffect } from 'usehooks-ts';
import { BaseWalletStrategy, SuiWalletStrategy, WalletType } from './wallet-strategies';

export { WalletType };

const walletTypeToStrategy = {
  [WalletType.Sui]: SuiWalletStrategy,
};

interface IWalletProviderProps {
  children: ReactNode;
  wallets: WalletType[];
}
interface IWalletContextState {
  connect(walletType: WalletType): void;
  signAndSubmitTransaction(transaction: MoveCallTransaction): Promise<TransactionResponse>;
  isConnected(): boolean;
  accounts: SuiAddress[];
}
type StrategiesType = { [key in WalletType]: BaseWalletStrategy };

const getStrategies = (wallets: WalletType[]) =>
  wallets.reduce(
    (strategies, walletType) => ({
      ...strategies,
      [walletType]: new walletTypeToStrategy[walletType](),
    }),
    {} as StrategiesType,
  );

const WalletContext = createContext<IWalletContextState>({} as IWalletContextState);

export const WalletProvider: FC<IWalletProviderProps> = ({ children, wallets }) => {
  const [accounts, setAccounts] = useState<SuiAddress[]>([]);
  const [strategies, setStrategies] = useState<StrategiesType>(getStrategies(wallets));
  const currentStrategy = useRef<BaseWalletStrategy>();

  useUpdateEffect(() => {
    setStrategies(getStrategies(wallets));
  }, [wallets]);

  const onWalletConnect = useCallback(
    (walletType: WalletType) => {
      if (strategies[walletType]) {
        currentStrategy.current = strategies[walletType];
        setAccounts(currentStrategy.current.accounts);
      }
    },
    [currentStrategy],
  );

  useEffect(() => {
    Object.values(strategies).forEach((strategy) => {
      strategy.on('connect', onWalletConnect);
    });

    return () => {
      Object.values(strategies).forEach((strategy) => {
        strategy.off('connect', onWalletConnect);
      });
    };
  }, [strategies]);

  const connect = useCallback(
    (walletType: WalletType) => {
      strategies[walletType].connect();
    },
    [strategies],
  );

  const signAndSubmitTransaction = useCallback(
    (tx: MoveCallTransaction) => {
      if (!currentStrategy.current) throw new WalletNotConnectedError();
      return currentStrategy.current.signAndSubmitTransaction(tx);
    },
    [currentStrategy],
  );

  const isConnected = useCallback(() => !!currentStrategy.current, [currentStrategy]);

  return (
    <WalletContext.Provider
      value={{
        connect,
        signAndSubmitTransaction,
        isConnected,
        accounts,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
export const useWallet = () => useContext(WalletContext);
