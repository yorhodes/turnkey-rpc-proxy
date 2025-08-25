import { TurnkeySigner } from '@turnkey/ethers';
import { TurnkeyClient } from '@turnkey/http';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { JsonRpcProvider } from 'ethers';
import { createServer } from 'http';
import winston from 'winston';

interface RPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number | string;
}

interface RPCResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string;
}

interface ProxyConfig {
  port: number;
  upstreamRpcUrl: string;
  turnkeyConfig: {
    baseUrl: string;
    organizationId: string;
    privateKeyId: string;
    apiPublicKey: string;
    apiPrivateKey: string;
  };
  enableLogging?: boolean;
  enableCors?: boolean;
}

class TurnkeyRpcProxy {
  private config: ProxyConfig;
  private turnkeySigner: TurnkeySigner;
  private turnkeyClient: TurnkeyClient;
  private upstreamProvider: JsonRpcProvider;
  private logger: winston.Logger;

  constructor(config: ProxyConfig) {
    this.config = config;

    // Initialize logger
    this.logger = winston.createLogger({
      level: config.enableLogging ? 'info' : 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'turnkey-forge-proxy.log' })
      ]
    });

    // Initialize Turnkey client with API stamper
    const stamper = new ApiKeyStamper({
      apiPublicKey: config.turnkeyConfig.apiPublicKey,
      apiPrivateKey: config.turnkeyConfig.apiPrivateKey,
    });

    this.turnkeyClient = new TurnkeyClient({
      baseUrl: config.turnkeyConfig.baseUrl,
    }, stamper);

    // Initialize Turnkey signer
    this.turnkeySigner = new TurnkeySigner({
      client: this.turnkeyClient,
      organizationId: config.turnkeyConfig.organizationId,
      signWith: config.turnkeyConfig.privateKeyId,
    });

    // Initialize upstream provider
    this.upstreamProvider = new JsonRpcProvider(config.upstreamRpcUrl);

    // Connect signer to upstream provider
    this.turnkeySigner = this.turnkeySigner.connect(this.upstreamProvider);
  }

  async handleRequest(request: RPCRequest): Promise<RPCResponse> {
    const { method, params, id } = request;
    this.logger.info('Incoming RPC request', { method, id });

    try {
      let result: any;

      switch (method) {
        case 'eth_accounts':
          result = [await this.turnkeySigner.getAddress()];
          break;

        case 'eth_sendTransaction':
          const tx = await this.turnkeySigner.sendTransaction(params[0]);
          this.logger.info('Transaction sent', { hash: tx.hash });
          result = tx.hash;
          break;

        case 'eth_signTransaction':
          result = await this.turnkeySigner.signTransaction(params[0]);
          break;

        case 'eth_sign':
        case 'personal_sign':
          result = await this.turnkeySigner.signMessage(params[0]);
          break;

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          const { domain, types, message } = JSON.parse(params[1]);
          result = await this.turnkeySigner.signTypedData(domain, types, message);
          break;

        default:
          return await this.forwardToUpstream(request);
      }

      return { jsonrpc: '2.0', result, id };
    } catch (error) {
      this.logger.error('Error handling request', { method, id, error });
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error)
        },
        id
      };
    }
  }

  private async forwardToUpstream(request: RPCRequest): Promise<RPCResponse> {
    this.logger.debug('Forwarding request to upstream', { method: request.method });

    try {
      const response = await fetch(this.config.upstreamRpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      return await response.json();
    } catch (error) {
      this.logger.error('Error forwarding to upstream', { error });
      throw error;
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      const server = createServer(async (req, res) => {
        // Handle CORS
        if (this.config.enableCors) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }
        }

        // Only handle POST requests
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Parse request body
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const request: RPCRequest = JSON.parse(body);
            const response = await this.handleRequest(request);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } catch (error) {
            this.logger.error('Error parsing request', { body, error });
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error'
              },
              id: null
            }));
          }
        });
      });

      server.listen(this.config.port, () => {
        this.logger.info(`🚀 Turnkey RPC Proxy started on port ${this.config.port}`);
        this.logger.info(`🔗 Upstream RPC: ${this.config.upstreamRpcUrl}`);
        this.logger.info(`🔐 Organization: ${this.config.turnkeyConfig.organizationId}`);
        this.logger.info(`💡 Use with Foundry: forge script Script.sol --rpc-url http://localhost:${this.config.port} --unlocked`);
        resolve();
      });
    });
  }
}

// Load configuration from environment variables and Bun secrets
function loadConfig(): ProxyConfig {
  // Bun.env automatically includes both environment variables and Bun secrets
  // Set secrets with: bun secret set TURNKEY_API_PRIVATE_KEY <value>
  const env = Bun.env;

  const config: ProxyConfig = {
    port: parseInt(env.PROXY_PORT || '8545'),
    upstreamRpcUrl: env.RPC_URL || 'https://eth.llamarpc.com',
    turnkeyConfig: {
      baseUrl: env.TURNKEY_BASE_URL || 'https://api.turnkey.com',
      organizationId: env.TURNKEY_ORGANIZATION_ID!,
      privateKeyId: env.TURNKEY_PRIVATE_KEY_ID!,
      apiPublicKey: env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: env.TURNKEY_API_PRIVATE_KEY!,
    },
    enableLogging: env.ENABLE_LOGGING === 'true',
    enableCors: env.ENABLE_CORS === 'true',
  };

  // Validate required configuration
  const missing = [];
  if (!config.turnkeyConfig.organizationId) missing.push('TURNKEY_ORGANIZATION_ID');
  if (!config.turnkeyConfig.privateKeyId) missing.push('TURNKEY_PRIVATE_KEY_ID');
  if (!config.turnkeyConfig.apiPublicKey) missing.push('TURNKEY_API_PUBLIC_KEY');
  if (!config.turnkeyConfig.apiPrivateKey) missing.push('TURNKEY_API_PRIVATE_KEY');

  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(envVar => {
      console.error(`   ${envVar}`);
    });
    console.error('\n💡 Set environment variables or use Bun secrets for sensitive values:');
    console.error('   export TURNKEY_ORGANIZATION_ID=your_org_id');
    console.error('   bun secret set TURNKEY_API_PRIVATE_KEY your_private_key');
    process.exit(1);
  }

  return config;
}

// Start server if run directly
if (import.meta.main) {
  try {
    const config = loadConfig();
    const proxy = new TurnkeyRpcProxy(config);
    await proxy.start();
  } catch (error) {
    console.error('Failed to start proxy:', error);
    process.exit(1);
  }
}

export { TurnkeyRpcProxy, type ProxyConfig };
