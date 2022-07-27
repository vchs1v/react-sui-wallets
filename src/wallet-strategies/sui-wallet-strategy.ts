import type { SuiAddress, TransactionResponse, MoveCallTransaction } from '@mysten/sui.js';
import EventEmitter from 'eventemitter3';
import { BaseWalletStrategy, WalletState, IWalletStrategyEvents, WalletType } from './base-wallet-strategy';
import { WalletDetector, WalletDetectorState } from './wallet-detector';
import { isBrowser } from '../utils/common';
import { WalletNotDetectedError, WalletNotSupportedError, WalletSignTransactionError } from '../errors';

interface ISuiWallet {
  hasPermissions(permissions?: string): Promise<boolean>;
  requestPermissions(permissions?: string): Promise<boolean>;
  getAccounts(): Promise<SuiAddress[]>;
  executeMoveCall(transaction: MoveCallTransaction): Promise<TransactionResponse>;
  executeSerializedMoveCall(transactionBytes: Uint8Array): Promise<TransactionResponse>;
}

export interface SuiWindow extends Window {
  suiWallet?: ISuiWallet;
}

declare const window: SuiWindow;

export class SuiWalletStrategy extends EventEmitter<IWalletStrategyEvents> implements BaseWalletStrategy {
  public readonly type: WalletType = WalletType.Sui;
  private _state: WalletState = !isBrowser() ? WalletState.Unsupported : WalletState.Supported;
  private walletDetector: WalletDetector<ISuiWallet>;
  private _accounts: SuiAddress[] = [];

  constructor() {
    super();
    this.walletDetector = new WalletDetector<ISuiWallet>(() => {
      if (window.suiWallet) {
        return window.suiWallet;
      }
    });
    this.walletDetector.on('detect', this.onWalletDetected.bind(this));
  }

  get accounts(): SuiAddress[] {
    return this._accounts;
  }

  get state(): WalletState {
    return this._state;
  }

  public async isConnected(): Promise<boolean> {
    return !!this.walletDetector.wallet && this.walletDetector.wallet.hasPermissions();
  }

  private async onWalletDetected() {
    this.emit('detect');
    const isConnected = await this.isConnected();
    if (isConnected) {
      const wallet = this.walletDetector.wallet!;
      this._accounts = await wallet.getAccounts();
      this._state = WalletState.Connected;
      this.emit('connect', this.type);
    }
  }

  public async connect(): Promise<boolean> {
    if (!isBrowser()) {
      return false;
    }

    const wallet = this.walletDetector.wallet;
    if (
      this._state === WalletState.Connected ||
      this._state === WalletState.Connecting ||
      (await wallet?.hasPermissions())
    )
      return false;
    if (this.walletDetector.state === WalletDetectorState.NotDetected) throw new WalletNotDetectedError();
    if (this._state === WalletState.Unsupported) throw new WalletNotSupportedError();

    this._state = WalletState.Connecting;

    try {
      const isApproved = await wallet?.requestPermissions();

      if (isApproved) {
        this._state = WalletState.Connected;
        this._accounts = await wallet?.getAccounts()!;
        this.emit('connect', this.type);
      } else {
        this._state = WalletState.Supported;
      }

      return isApproved!;
    } catch (error) {
      throw error;
    }
  }

  public async signAndSubmitTransaction(transaction: MoveCallTransaction): Promise<TransactionResponse> {
    const wallet = this.walletDetector.wallet;
    if (!wallet) throw new WalletNotDetectedError();

    try {
      return wallet.executeMoveCall(transaction);
    } catch (error: any) {
      throw new WalletSignTransactionError(error);
    }
  }
}
