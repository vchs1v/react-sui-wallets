import type { SuiAddress, MoveCallTransaction, TransactionResponse } from '@mysten/sui.js';
import EventEmitter from 'eventemitter3';

export enum WalletState {
  /** Wallet is unsupported on this platform (i.e. NodeJs) */
  Unsupported,
  Supported,
  Connected,
  Connecting,
}
export enum WalletType {
  Sui = 'Sui',
}

export interface IWalletStrategyEvents {
  detect(): void;
  connect(walletType: WalletType): void;
}

export interface BaseWalletStrategy extends EventEmitter<IWalletStrategyEvents> {
  readonly type: WalletType;
  connect(): Promise<boolean>;
  signAndSubmitTransaction(transaction: MoveCallTransaction): Promise<TransactionResponse>;
  isConnected(): Promise<boolean>;

  get accounts(): SuiAddress[];
  get state(): WalletState;
}
