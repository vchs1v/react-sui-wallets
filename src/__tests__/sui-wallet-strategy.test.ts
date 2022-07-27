import type { MoveCallTransaction } from '@mysten/sui.js';
import { WalletState } from '../wallet-strategies/base-wallet-strategy';
import { SuiWalletStrategy, SuiWindow } from '../wallet-strategies/sui-wallet-strategy';
import { isBrowser } from '../utils/common';
import { mockIdleCallback } from '../utils/testUtils';
import { WalletNotDetectedError, WalletNotSupportedError, WalletSignTransactionError } from '../errors';

declare const window: SuiWindow;

jest.mock('../utils/common');

const mockIsBrowser = isBrowser as jest.Mock<any>;
mockIsBrowser.mockReturnValue(true);
mockIdleCallback();

const mockAccounts = ['test-key'];

beforeEach(() => {
  //@ts-ignore
  window.suiWallet = {
    hasPermissions: jest.fn().mockResolvedValue(false),
    requestPermissions: jest.fn().mockResolvedValue(true),
    getAccounts: jest.fn().mockResolvedValue(mockAccounts),
    executeMoveCall: jest.fn().mockResolvedValue({}),
  };
});

describe('SuiWalletStrategy', () => {
  describe('constructor', () => {
    it('should set initial state properly if not in browser environment', () => {
      mockIsBrowser.mockReturnValueOnce(false);
      const strategy = new SuiWalletStrategy();

      expect(strategy.state).toBe(WalletState.Unsupported);
      expect(strategy.accounts).toStrictEqual([]);
    });
  });

  describe('connect', () => {
    it('should connect wallet if supported', () => {
      const strategy = new SuiWalletStrategy();

      expect(strategy.state).toBe(WalletState.Supported);

      strategy.once('detect', async () => {
        await strategy.connect();

        expect(window.suiWallet?.requestPermissions).toHaveBeenCalledTimes(1);
        expect(strategy.state).toBe(WalletState.Connected);
        expect(strategy.accounts).toBe(mockAccounts);
      });
    });

    it('should not connect wallet twice', async () => {
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await strategy.connect();
        await strategy.connect();

        expect(window.suiWallet?.requestPermissions).toBeCalledTimes(1);
      });
    });

    it('should not connect wallet if it already has permissions', async () => {
      (window.suiWallet?.hasPermissions as jest.Mock<any>).mockResolvedValueOnce(true);
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await strategy.connect();

        // one time on connection check and one in connect() method
        expect(window.suiWallet?.hasPermissions).toHaveBeenCalledTimes(2);
        expect(window.suiWallet?.requestPermissions).not.toHaveBeenCalled();
      });
    });

    it('should throw an error when trying to connect to undetected wallet', async () => {
      window.suiWallet = undefined;
      const strategy = new SuiWalletStrategy();

      await expect(strategy.connect()).rejects.toThrow(new WalletNotDetectedError());
    });

    it('should throw an error when trying to connect on unsupported platform', async () => {
      mockIsBrowser.mockReturnValueOnce(false);
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await expect(strategy.connect()).rejects.toThrow(new WalletNotSupportedError());
      });
    });

    it("should set Supported state if permission request wasn't approved", () => {
      (window.suiWallet?.requestPermissions as jest.Mock<any>).mockResolvedValueOnce(false);
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await strategy.connect();

        expect(strategy.state).toBe(WalletState.Supported);
      });
    });
  });

  describe('signAndSubmitTransaction', () => {
    it('should throw error if wallet is not detected', () => {
      window.suiWallet = undefined;
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await expect(strategy.signAndSubmitTransaction({} as MoveCallTransaction)).rejects.toThrow(
          new WalletNotDetectedError(),
        );
      });
    });

    it('should execute transaction', () => {
      const transaction = {} as MoveCallTransaction;
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await strategy.signAndSubmitTransaction(transaction);

        expect(window.suiWallet?.executeMoveCall).toHaveBeenCalledWith(transaction);
        expect(window.suiWallet?.executeMoveCall).toHaveBeenCalledTimes(1);
      });
    });

    it('should throw error if transaction was failed', () => {
      const testError = new Error('test error');
      (window.suiWallet?.executeMoveCall as jest.Mock<any>).mockRejectedValueOnce(testError);
      const strategy = new SuiWalletStrategy();

      strategy.once('detect', async () => {
        await expect(strategy.signAndSubmitTransaction({} as MoveCallTransaction)).rejects.toThrow(
          new WalletSignTransactionError('test error'),
        );
      });
    });
  });
});
