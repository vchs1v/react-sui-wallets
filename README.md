# React Sui wallets

React library to make interaction with Sui wallets easy

Wallets supported:

- Sui

## Installation

```
npm install react-sui-wallets
```

## Api

### **WalletProvider**

#### props:

- wallets: WalletType[] - wallets that app will support

#### Example

```bash
  import { WalletProvider, WalletType } from 'react-sui-wallets';

  export const App = () => (
    <WalletProvider
      wallets={[WalletType.Sui]}
    >
      // other components...
    </WalletProvider>
  );
```

### **useWallet()**

#### returns:

- connect: (walletType: WalletType) => void - tries connect to provided wallet
- signAndSubmitTransaction: (tx: MoveCallTransaction): Promise\<TransactionResponse> - submits provided transaction
- isConnected: () => boolean
- accounts: SuiAddress[]

#### example:

```bash
  import { useWallet, WalletType } from 'react-sui-wallets';

  export const App = () => {
    const { isConnected, connect, accounts } = useWallet();

    return (
      <div>
        {isConnected()
          ? accounts[0]
          : <button onClick={() => connect(WalletType.Sui)}>Connect wallet</button>}
      </div>
    );
  }
```
