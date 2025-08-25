# Turnkey RPC Proxy

A secure HTTP JSON-RPC proxy server that integrates [Turnkey's](https://turnkey.com) policy engine and signing infrastructure with any Ethereum development tooling (Foundry, Remix, etc.).

## 🚀 Features

- **Universal Compatibility**: Works with any Ethereum tooling that supports custom RPC endpoints
- **Turnkey Integration**: Secure key management with policy engine enforcement  
- **Policy Engine**: Leverage Turnkey's 2025 policy capabilities (spending limits, allowlisting, multi-sig approval)
- **Hot Reloading**: Built with Bun for fast development cycles
- **Secure Secrets**: Uses Bun's built-in secrets management
- **Full Logging**: Comprehensive transaction and signing logs
- **CORS Support**: Enable for browser-based dApps

## 📦 Installation

```bash
bun install
```

## 🔧 Configuration

### Using Bun Secrets (Recommended)

Set your sensitive credentials securely with Bun's native secrets manager:

```bash
# Set sensitive values as Bun secrets
bun secret set TURNKEY_API_PRIVATE_KEY "your-private-key"
bun secret set TURNKEY_API_PUBLIC_KEY "your-public-key"

# Set other required values as environment variables or secrets
export TURNKEY_ORGANIZATION_ID="your-org-id"
export TURNKEY_PRIVATE_KEY_ID="your-key-id"
```

### Environment Variables

Alternatively, create a `.env` file or set environment variables:

```bash
# Required
TURNKEY_ORGANIZATION_ID=your-turnkey-org-id
TURNKEY_PRIVATE_KEY_ID=your-turnkey-private-key-id
TURNKEY_API_PUBLIC_KEY=your-api-public-key
TURNKEY_API_PRIVATE_KEY=your-api-private-key

# Optional
PROXY_PORT=8545
UPSTREAM_RPC_URL=https://eth.llamarpc.com
TURNKEY_BASE_URL=https://api.turnkey.com
ENABLE_LOGGING=true
ENABLE_CORS=false
```

## 🏃 Usage

### Start the Proxy

```bash
# Development with hot reload
bun dev

# Production
bun run build
bun start
```

### Use with Foundry

```bash
# Deploy a contract
forge script script/Deploy.s.sol \\
  --rpc-url http://localhost:8545 \\
  --unlocked \\
  --broadcast

# Interact with contracts
forge script script/Interact.s.sol \\
  --rpc-url http://localhost:8545 \\
  --unlocked
```

### Use with Remix

1. Set `ENABLE_CORS=true` in your environment and start: `bun dev`
2. In Remix, go to Deploy & Run Transactions
3. Select "External Http Provider" 
4. Enter: `http://localhost:8545`

## 🔐 Security & Policy Engine

The proxy leverages Turnkey's advanced policy engine for secure transaction signing:

- **Spending Limits**: Set daily/monthly transaction limits
- **Allowlisting**: Restrict transactions to pre-approved addresses
- **Multi-Signature**: Require multiple approvals for high-value transactions
- **Time-based Rules**: Enforce business hours or cooldown periods
- **Cross-chain Policies**: Unified rules across EVM, Solana, and TRON

All transactions are processed through Turnkey's secure enclaves with full audit trails.

## 📋 API Reference

The proxy implements standard Ethereum JSON-RPC methods:

### Signing Methods (via Turnkey)
- `eth_accounts` - Returns Turnkey wallet address
- `eth_sendTransaction` - Signs and broadcasts transaction
- `eth_signTransaction` - Signs transaction (returns signed tx)
- `personal_sign` - Signs arbitrary messages
- `eth_signTypedData_v4` - Signs EIP-712 typed data

### Proxied Methods (to upstream RPC)
- `eth_getBalance`
- `eth_getTransactionCount`
- `eth_call`
- `eth_estimateGas`
- All other standard JSON-RPC methods

## 🛠 Development

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production  
bun build

# Run tests
bun test

# Format code
bun format

# Lint code
bun lint
```

## 📁 Project Structure

```
src/
└── index.ts          # Main proxy server implementation
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT

## 🔗 Links

- [Turnkey Documentation](https://docs.turnkey.com/)
- [Turnkey Policy Engine](https://docs.turnkey.com/concepts/policies/overview)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Bun Documentation](https://bun.sh/docs)

## 🆘 Troubleshooting

### Common Issues

**"Missing required configuration"**
- Ensure all Turnkey credentials are set via Bun secrets or environment variables
- Verify your Turnkey organization ID and private key ID are correct

**"Connection refused"**  
- Check that the upstream RPC URL is accessible
- Verify your network connection and RPC endpoint

**"Transaction signing failed"**
- Confirm your Turnkey private key has sufficient permissions
- Check Turnkey policy rules aren't blocking the transaction
- Review proxy logs for detailed error messages

**CORS errors in browser**
- Set `ENABLE_CORS=true` in environment variables