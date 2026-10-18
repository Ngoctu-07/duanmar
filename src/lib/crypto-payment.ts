import { encodeFunctionData, erc20Abi, getAddress, isAddress, parseUnits } from "viem";

/**
 * Web3 crypto payment rail (MetaMask / EIP-1193).
 *
 * Sits beside the fiat rails (`momo` / `bank`) as an independent settlement
 * layer: the booking total is converted to a USD-stablecoin amount and settled
 * peer-to-wallet on a low-cost EVM chain (Polygon / BNB Chain by default). This
 * module is pure + isomorphic — the UI layer owns the wallet interaction, this
 * owns addressing, encoding and amount math so it is unit-testable in Node.
 */

/** Canonical method id persisted on the order payload + email. */
export const CRYPTO_METHOD = "crypto_metamask" as const;

/** EVM address: 0x + 40 hex chars. */
export const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
/** EVM transaction hash: 0x + 64 hex chars. */
export const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function isEvmAddress(value: unknown): value is string {
  return typeof value === "string" && EVM_ADDRESS_PATTERN.test(value.trim());
}

export function isTransactionHash(value: unknown): value is string {
  return typeof value === "string" && TX_HASH_PATTERN.test(value.trim());
}

/** Chain metadata used for `wallet_switchEthereumChain` / `wallet_addEthereumChain`. */
export interface EvmChain {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const EVM_CHAINS: Record<number, EvmChain> = {
  137: {
    id: 137,
    name: "Polygon Mainnet",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  56: {
    id: 56,
    name: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  8453: {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
  1: {
    id: 1,
    name: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
};

/** Human chain label; falls back to `Chain <id>` for unknown networks. */
export function chainName(chainId: number): string {
  return EVM_CHAINS[chainId]?.name ?? `Chain ${chainId}`;
}

/** Resolved, validated crypto config (null when the business wallet is unset). */
export interface CryptoConfig {
  walletAddress: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  /** VND per 1 USD — required to price VND books in a USD stablecoin. */
  vndPerUsd: number | null;
}

/** Raw env bag (kept explicit so it unit-tests without touching `process.env`). */
export interface CryptoEnv {
  walletAddress?: string;
  chainId?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: string;
  vndPerUsd?: string;
}

const asPositiveInt = (raw: string | undefined, fallback: number): number => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/**
 * Validate raw env into a `CryptoConfig`, or `null` when the rail is
 * unconfigured (missing/invalid wallet or token address). Never throws.
 */
export function resolveCryptoConfig(env: CryptoEnv): CryptoConfig | null {
  if (!isEvmAddress(env.walletAddress)) return null;
  if (!isEvmAddress(env.tokenAddress)) return null;

  const vndPerUsd = Number(env.vndPerUsd);
  const tokenDecimals = asPositiveInt(env.tokenDecimals, 6);
  return {
    walletAddress: getAddress(env.walletAddress!.trim()),
    chainId: asPositiveInt(env.chainId, 137),
    tokenAddress: getAddress(env.tokenAddress!.trim()),
    tokenSymbol: (env.tokenSymbol ?? "").trim() || "USDT",
    tokenDecimals: tokenDecimals <= 18 ? tokenDecimals : 6,
    vndPerUsd: Number.isFinite(vndPerUsd) && vndPerUsd > 0 ? vndPerUsd : null,
  };
}

/**
 * Convert a booking total to a USD amount for a USD stablecoin.
 * USD books pass through; VND books need a positive `vndPerUsd` rate.
 * Returns `null` (→ hide the crypto rail) rather than inventing a rate.
 */
export function toUsdAmount(
  total: number,
  currency: "VND" | "USD",
  vndPerUsd: number | null
): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  if (currency === "USD") return Math.round(total * 100) / 100;
  if (!vndPerUsd || vndPerUsd <= 0) return null;
  return Math.round((total / vndPerUsd) * 100) / 100;
}

/** USD amount → token base units (e.g. 25.5 USDT @6dp → 25500000n). */
export function toTokenUnits(usdAmount: number, decimals: number): bigint {
  return parseUnits(usdAmount.toFixed(decimals), decimals);
}

/**
 * ABI-encoded `transfer(to, amount)` calldata for an ERC-20 token.
 * Encoded with viem so the selector + argument padding are spec-correct.
 */
export function buildErc20TransferData(
  to: string,
  amountBaseUnits: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [getAddress(to), amountBaseUnits],
  });
}

/**
 * EIP-681 payment URI for an ERC-20 transfer — encodes the deposit wallet,
 * token contract, chain and exact amount so a wallet QR scan prefills the tx.
 */
export function buildEip681Uri(params: {
  tokenAddress: string;
  chainId: number;
  to: string;
  amountBaseUnits: bigint;
}): string {
  const { tokenAddress, chainId, to, amountBaseUnits } = params;
  return `ethereum:${getAddress(tokenAddress)}@${chainId}/transfer?address=${getAddress(
    to
  )}&uint256=${amountBaseUnits.toString()}`;
}

export type CryptoQuote =
  | {
      ok: true;
      usdAmount: number;
      amountBaseUnits: bigint;
      transferData: `0x${string}`;
      uri: string;
    }
  | { ok: false; reason: "unconfigured" | "unsupported-currency" };

/**
 * Full payment quote: USD amount, base units, ERC-20 calldata and the EIP-681
 * QR URI. `unconfigured` = wallet set but no conversion rate (VND book);
 * `unsupported-currency` = no config at all.
 */
export function buildCryptoQuote(
  config: CryptoConfig | null,
  total: number,
  currency: "VND" | "USD"
): CryptoQuote {
  if (!config) return { ok: false, reason: "unsupported-currency" };
  const usdAmount = toUsdAmount(total, currency, config.vndPerUsd);
  if (usdAmount === null) return { ok: false, reason: "unconfigured" };

  const amountBaseUnits = toTokenUnits(usdAmount, config.tokenDecimals);
  return {
    ok: true,
    usdAmount,
    amountBaseUnits,
    transferData: buildErc20TransferData(config.walletAddress, amountBaseUnits),
    uri: buildEip681Uri({
      tokenAddress: config.tokenAddress,
      chainId: config.chainId,
      to: config.walletAddress,
      amountBaseUnits,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* EIP-1193 wallet interaction (browser only)                                 */
/* -------------------------------------------------------------------------- */

/** Minimal EIP-1193 provider surface we rely on. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

/** Typed error codes returned by wallets (EIP-1193 / EIP-1474). */
export type CryptoErrorCode = "no-provider" | "rejected" | "chain" | "failed";

export class CryptoPaymentError extends Error {
  code: CryptoErrorCode;
  constructor(code: CryptoErrorCode) {
    super(code);
    this.code = code;
    this.name = "CryptoPaymentError";
  }
}

/** Map a raw provider error to a coarse, UI-friendly code. */
export function classifyProviderError(error: unknown): CryptoErrorCode {
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (code === 4001) return "rejected";
  if (code === 4902) return "chain";
  return "failed";
}

/** Hex chain id as wallets expect it, e.g. 137 → "0x89". */
export function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

/** Read the injected MetaMask provider, or `null` when no wallet is present. */
export function getInjectedProvider(
  win: { ethereum?: Eip1193Provider } | undefined
): Eip1193Provider | null {
  const provider = win?.ethereum;
  return provider && typeof provider.request === "function" ? provider : null;
}

/** `eth_requestAccounts` → first account, or throws when the user cancels. */
export async function requestAccounts(provider: Eip1193Provider): Promise<string> {
  try {
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!Array.isArray(accounts) || !accounts[0] || !isAddress(accounts[0])) {
      throw new CryptoPaymentError("failed");
    }
    return getAddress(accounts[0]);
  } catch (error) {
    if (error instanceof CryptoPaymentError) throw error;
    throw new CryptoPaymentError(classifyProviderError(error));
  }
}

/** Ensure the wallet is on `chainId`; add the chain first when unknown (4902). */
export async function ensureChain(
  provider: Eip1193Provider,
  chainId: number
): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: toHexChainId(chainId) }],
    });
    return;
  } catch (error) {
    if (classifyProviderError(error) !== "chain") {
      throw new CryptoPaymentError(classifyProviderError(error));
    }
  }

  const chain = EVM_CHAINS[chainId];
  if (!chain) throw new CryptoPaymentError("chain");
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: toHexChainId(chain.id),
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls,
          blockExplorerUrls: chain.blockExplorerUrls,
        },
      ],
    });
  } catch (error) {
    throw new CryptoPaymentError(classifyProviderError(error));
  }
}

/**
 * Broadcast the ERC-20 transfer and return the transaction hash.
 * Gas/fees are delegated to the wallet (MetaMask), so no local estimation.
 */
export async function sendErc20Transfer(
  provider: Eip1193Provider,
  params: {
    from: string;
    tokenAddress: string;
    transferData: `0x${string}`;
  }
): Promise<string> {
  try {
    const hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: getAddress(params.from),
          to: getAddress(params.tokenAddress),
          data: params.transferData,
          value: "0x0",
        },
      ],
    })) as string;
    if (!isTransactionHash(hash)) throw new CryptoPaymentError("failed");
    return hash;
  } catch (error) {
    if (error instanceof CryptoPaymentError) throw error;
    throw new CryptoPaymentError(classifyProviderError(error));
  }
}

/** Block-explorer transaction URL, or `null` when the chain is unknown. */
export function explorerTxUrl(chainId: number, txHash: string): string | null {
  const base = EVM_CHAINS[chainId]?.blockExplorerUrls?.[0];
  return base ? `${base}/tx/${txHash}` : null;
}
