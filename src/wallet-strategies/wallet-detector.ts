import { isBrowser } from '../utils/common';
import EventEmitter from 'eventemitter3';

interface WalletDetectorEvents {
  detect(): void;
}

export enum WalletDetectorState {
  NotDetected,
  Detected,
  Timeout,
}

export class WalletDetector<T> extends EventEmitter<WalletDetectorEvents> {
  private _state: WalletDetectorState;
  private _wallet: T | null;
  private detectAndDesposeCb: () => void;
  private disposers: (() => void)[];

  constructor(detect: () => T | undefined) {
    super();

    this.detectAndDesposeCb = () => {
      const detected = detect();
      if (detected && this._state !== WalletDetectorState.Detected) {
        this._wallet = detected;
        this._state = WalletDetectorState.Detected;
        this.emit('detect');
        this.despose();
      }
    };

    this._wallet = null;
    this.disposers = [];
    this._state = WalletDetectorState.NotDetected;

    setTimeout(() => {
      this.despose();
      this._state = WalletDetectorState.Timeout;
    }, 15000);

    // To not to miss subscribers
    Promise.resolve().then(this.detectWallet.bind(this));
  }

  get wallet() {
    return this._wallet;
  }

  get state() {
    return this._state;
  }

  private detectWallet() {
    if (!isBrowser()) {
      return;
    }

    let idleCallbackId: number;

    const idleCallback = () => {
      this.detectAndDesposeCb();
      cancelIdleCallback(idleCallbackId);
      idleCallbackId = requestIdleCallback(idleCallback, { timeout: 1000 });
    };

    idleCallbackId = requestIdleCallback(idleCallback, { timeout: 1000 });
    this.disposers.push(() => cancelIdleCallback(idleCallbackId));

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', this.detectAndDesposeCb, { once: true });
      this.disposers.push(() => document.removeEventListener('DOMContentLoaded', this.detectAndDesposeCb));
    }

    if (document.readyState !== 'complete') {
      window.addEventListener('load', this.detectAndDesposeCb, { once: true });
      this.disposers.push(() => window.removeEventListener('load', this.detectAndDesposeCb));
    }

    this.detectAndDesposeCb();
  }

  private despose() {
    this.disposers.forEach(() => {
      const desposer = this.disposers.pop()!;
      desposer();
    });
  }
}
