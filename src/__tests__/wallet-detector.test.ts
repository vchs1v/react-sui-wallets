import { WalletDetector, WalletDetectorState } from '../wallet-strategies/wallet-detector';
import { mockIdleCallback } from '../utils/testUtils';

jest.mock('../utils/common', () => ({
  isBrowser: () => true,
}));
mockIdleCallback();

describe('WalletDetector', () => {
  it('should detect a wallet immediately if exists', () => {
    const testWallet = {};
    const walletDetector = new WalletDetector(() => {
      return testWallet;
    });

    walletDetector.once('detect', () => {
      expect(walletDetector.wallet).toBe(testWallet);
      expect(walletDetector.state).toBe(WalletDetectorState.Detected);
    });
  });

  it('should detect wallet with delay before timeout', () => {
    jest.useFakeTimers();

    const testWallet = {};
    let shouldDetect = false;

    setTimeout(() => {
      shouldDetect = true;
    }, 1000);

    const walletDetector = new WalletDetector(() => {
      if (shouldDetect) {
        return testWallet;
      }
    });

    expect(walletDetector.state).toBe(WalletDetectorState.NotDetected);
    expect(walletDetector.wallet).toBeNull();

    setTimeout(() => {
      expect(walletDetector.state).toBe(WalletDetectorState.Detected);
      expect(walletDetector.wallet).toBe(testWallet);
    }, 1000);

    jest.useRealTimers();
  });

  it('should set Timeout state, if wallet is not detected', () => {
    global.requestIdleCallback = () => 1;
    global.cancelIdleCallback = () => {};

    jest.useFakeTimers();

    const walletDetector = new WalletDetector(() => {
      return null;
    });

    expect(walletDetector.state).toBe(WalletDetectorState.NotDetected);
    expect(walletDetector.wallet).toBeNull();

    jest.runAllTimers();

    expect(walletDetector.state).toBe(WalletDetectorState.Timeout);
    expect(walletDetector.wallet).toBeNull();
  });
});
