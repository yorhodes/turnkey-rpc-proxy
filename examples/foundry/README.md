# Foundry + Turnkey RPC Proxy Example

This example demonstrates how to use the Turnkey RPC Proxy with Foundry for secure contract deployment and interaction.

## Setup

1. Start the Turnkey RPC Proxy:
```bash
cd ../.. # Go to project root
bun dev
```

2. Initialize Foundry project (if needed):
```bash
forge init
```

## Deploy Contract

Deploy using Turnkey signing via the RPC proxy:

```bash
forge script script/Deploy.s.sol \\
  --rpc-url turnkey \\
  --unlocked \\
  --broadcast \\
  --verify
```

## Alternative Deployment Commands

```bash
# Deploy to specific network via proxy
forge script script/Deploy.s.sol \\
  --rpc-url http://localhost:8545 \\
  --unlocked \\
  --broadcast

# Deploy with gas estimation
forge script script/Deploy.s.sol \\
  --rpc-url turnkey \\
  --unlocked \\
  --broadcast \\
  --gas-estimate-multiplier 120

# Deploy with verification on Etherscan
forge script script/Deploy.s.sol \\
  --rpc-url turnkey \\
  --unlocked \\
  --broadcast \\
  --verify \\
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Interact with Contracts

```bash
# Call view function
cast call <CONTRACT_ADDRESS> "value()" --rpc-url turnkey

# Send transaction via Turnkey proxy
cast send <CONTRACT_ADDRESS> "setValue(uint256)" 123 \\
  --rpc-url http://localhost:8545

# Check transaction receipt
cast receipt <TX_HASH> --rpc-url turnkey
```

## Benefits

- **Secure Signing**: All transactions signed by Turnkey's secure enclaves
- **Policy Enforcement**: Turnkey policy rules automatically enforced
- **Audit Trail**: Complete transaction history in Turnkey dashboard
- **No Private Keys**: Never expose private keys in scripts or environment