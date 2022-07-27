export class WalletNotDetectedError extends Error {
  constructor() {
    super('Wallet is not detected');
  }
}

export class WalletNotSupportedError extends Error {
  constructor() {
    super('Wallet not supported in current environment');
  }
}

export class WalletNotConnectedError extends Error {
  constructor() {
    super("Wallet hasn't been connected yet");
  }
}

export class WalletSignTransactionError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}
