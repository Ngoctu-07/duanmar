import assert from "node:assert/strict";

const {
  buildCryptoQuote,
  buildEip681Uri,
  buildErc20TransferData,
  chainName,
  classifyProviderError,
  CryptoPaymentError,
  ensureChain,
  EVM_CHAINS,
  explorerTxUrl,
  getInjectedProvider,
  isEvmAddress,
  isTransactionHash,
  requestAccounts,
  resolveCryptoConfig,
  sendErc20Transfer,
  toHexChainId,
  toTokenUnits,
  toUsdAmount,
} = await import("../../src/lib/crypto-payment.ts");

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};
const checkAsync = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const WALLET = "0x1111111111111111111111111111111111111111";
const TOKEN = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const HASH = "0x" + "a".repeat(64);

const baseEnv = {
  walletAddress: WALLET,
  chainId: "137",
  tokenAddress: TOKEN,
  tokenSymbol: "USDT",
  tokenDecimals: "6",
  vndPerUsd: "25000",
};

/* --- guards --- */

check("isEvmAddress accepts 0x+40hex, rejects junk", () => {
  assert.equal(isEvmAddress(WALLET), true);
  assert.equal(isEvmAddress(TOKEN), true);
  assert.equal(isEvmAddress("0x1234"), false);
  assert.equal(isEvmAddress("1111111111111111111111111111111111111111"), false);
  assert.equal(isEvmAddress(null), false);
  assert.equal(isEvmAddress(42), false);
});

check("isTransactionHash accepts 0x+64hex only", () => {
  assert.equal(isTransactionHash(HASH), true);
  assert.equal(isTransactionHash("0x" + "a".repeat(63)), false);
  assert.equal(isTransactionHash("0x" + "g".repeat(64)), false);
  assert.equal(isTransactionHash(undefined), false);
});

/* --- config --- */

check("resolveCryptoConfig: missing wallet/token → null", () => {
  assert.equal(resolveCryptoConfig({}), null);
  assert.equal(resolveCryptoConfig({ ...baseEnv, walletAddress: "nope" }), null);
  assert.equal(resolveCryptoConfig({ ...baseEnv, tokenAddress: undefined }), null);
});

check("resolveCryptoConfig: defaults chain 137 + 6 decimals, checksums addresses", () => {
  const config = resolveCryptoConfig(baseEnv);
  assert.ok(config);
  assert.equal(config.chainId, 137);
  assert.equal(config.tokenDecimals, 6);
  assert.equal(config.tokenSymbol, "USDT");
  assert.equal(config.vndPerUsd, 25000);
  assert.equal(config.walletAddress, WALLET);
  // Mixed-case checksum is preserved for the known USDT contract.
  assert.equal(config.tokenAddress, "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
});

check("resolveCryptoConfig: invalid decimals/chain/rate fall back safely", () => {
  const config = resolveCryptoConfig({
    ...baseEnv,
    chainId: "not-a-number",
    tokenDecimals: "99",
    vndPerUsd: "-5",
  });
  assert.ok(config);
  assert.equal(config.chainId, 137);
  assert.equal(config.tokenDecimals, 6);
  assert.equal(config.vndPerUsd, null);
});

/* --- amount math --- */

check("toUsdAmount: USD passthrough, VND needs a rate", () => {
  assert.equal(toUsdAmount(350, "USD", null), 350);
  assert.equal(toUsdAmount(350000, "VND", 25000), 14);
  assert.equal(toUsdAmount(350000, "VND", 25000.4), 14);
  assert.equal(toUsdAmount(350000, "VND", null), null);
  assert.equal(toUsdAmount(0, "USD", 25000), null);
  assert.equal(toUsdAmount(Number.NaN, "USD", 25000), null);
});

check("toTokenUnits: decimal → base units", () => {
  assert.equal(toTokenUnits(25.5, 6), 25500000n);
  assert.equal(toTokenUnits(1, 18), 1000000000000000000n);
  assert.equal(toTokenUnits(14, 6), 14000000n);
});

/* --- encoding --- */

check("buildErc20TransferData: canonical ERC-20 transfer selector + args", () => {
  const data = buildErc20TransferData(WALLET, 1000000n);
  const expected =
    "0xa9059cbb" +
    "0".repeat(24) +
    "1".repeat(40) +
    "0".repeat(59) +
    "f4240";
  assert.equal(data.toLowerCase(), expected.toLowerCase(), data);
  assert.equal(data.length, 138);
});

check("buildEip681Uri: encodes token, chain, recipient and amount", () => {
  const uri = buildEip681Uri({
    tokenAddress: TOKEN,
    chainId: 137,
    to: WALLET,
    amountBaseUnits: 14000000n,
  });
  assert.equal(
    uri,
    `ethereum:${TOKEN}@137/transfer?address=${WALLET}&uint256=14000000`
  );
});

/* --- quote --- */

check("buildCryptoQuote: VND book → USD stablecoin amount + calldata + uri", () => {
  const config = resolveCryptoConfig(baseEnv)!;
  const quote = buildCryptoQuote(config, 350000, "VND");
  assert.equal(quote.ok, true);
  if (!quote.ok) return;
  assert.equal(quote.usdAmount, 14);
  assert.equal(quote.amountBaseUnits, 14000000n);
  assert.ok(quote.transferData.startsWith("0xa9059cbb"));
  assert.ok(quote.uri.startsWith(`ethereum:${TOKEN}@137/transfer`));
});

check("buildCryptoQuote: USD book needs no rate", () => {
  const config = resolveCryptoConfig({ ...baseEnv, vndPerUsd: "" })!;
  const quote = buildCryptoQuote(config, 99, "USD");
  assert.equal(quote.ok, true);
  if (quote.ok) assert.equal(quote.usdAmount, 99);
});

check("buildCryptoQuote: no config → unsupported; VND without rate → unconfigured", () => {
  assert.deepEqual(buildCryptoQuote(null, 100, "USD"), {
    ok: false,
    reason: "unsupported-currency",
  });
  const config = resolveCryptoConfig({ ...baseEnv, vndPerUsd: "" })!;
  assert.deepEqual(buildCryptoQuote(config, 350000, "VND"), {
    ok: false,
    reason: "unconfigured",
  });
});

/* --- errors + helpers --- */

check("classifyProviderError maps wallet codes", () => {
  assert.equal(classifyProviderError({ code: 4001 }), "rejected");
  assert.equal(classifyProviderError({ code: 4902 }), "chain");
  assert.equal(classifyProviderError({ code: 9999 }), "failed");
  assert.equal(classifyProviderError(new Error("boom")), "failed");
});

check("toHexChainId + chainName + explorerTxUrl", () => {
  assert.equal(toHexChainId(137), "0x89");
  assert.equal(toHexChainId(56), "0x38");
  assert.equal(chainName(137), "Polygon Mainnet");
  assert.equal(chainName(999999), "Chain 999999");
  assert.equal(explorerTxUrl(137, HASH), `https://polygonscan.com/tx/${HASH}`);
  assert.equal(explorerTxUrl(999999, HASH), null);
});

check("getInjectedProvider: only returns an EIP-1193 request provider", () => {
  assert.equal(getInjectedProvider(undefined), null);
  assert.equal(getInjectedProvider({}), null);
  const provider = { request: async () => [] };
  assert.equal(getInjectedProvider({ ethereum: provider }), provider);
});

/* --- EIP-1193 flow with a fake provider --- */

type Handler = (args: { method: string; params?: unknown }) => unknown;

const fakeProvider = (handler: Handler) => ({
  request: async (args: { method: string; params?: unknown }) => handler(args),
});

await checkAsync("requestAccounts returns the first checksummed account", async () => {
  const provider = fakeProvider(() => [WALLET]);
  assert.equal(await requestAccounts(provider), WALLET);
});

await checkAsync("requestAccounts maps a user rejection (4001)", async () => {
  const provider = fakeProvider(() => {
    throw { code: 4001 };
  });
  await assert.rejects(
    () => requestAccounts(provider),
    (error: unknown) => error instanceof CryptoPaymentError && error.code === "rejected"
  );
});

await checkAsync("ensureChain: switches when already known", async () => {
  const calls: string[] = [];
  const provider = fakeProvider(({ method }) => {
    calls.push(method);
    return null;
  });
  await ensureChain(provider, 137);
  assert.deepEqual(calls, ["wallet_switchEthereumChain"]);
});

await checkAsync("ensureChain: adds the chain on 4902 then succeeds", async () => {
  const calls: string[] = [];
  const provider = fakeProvider(({ method }) => {
    calls.push(method);
    if (method === "wallet_switchEthereumChain") throw { code: 4902 };
    return null;
  });
  await ensureChain(provider, EVM_CHAINS[137].id);
  assert.deepEqual(calls, ["wallet_switchEthereumChain", "wallet_addEthereumChain"]);
});

await checkAsync("ensureChain: unknown chain id → 'chain' error", async () => {
  const provider = fakeProvider(({ method }) => {
    if (method === "wallet_switchEthereumChain") throw { code: 4902 };
    return null;
  });
  await assert.rejects(
    () => ensureChain(provider, 999999),
    (error: unknown) => error instanceof CryptoPaymentError && error.code === "chain"
  );
});

await checkAsync("sendErc20Transfer returns a valid hash, rejects malformed", async () => {
  const ok = fakeProvider(() => HASH);
  assert.equal(
    await sendErc20Transfer(ok, { from: WALLET, tokenAddress: TOKEN, transferData: "0xdead" }),
    HASH
  );
  const bad = fakeProvider(() => "0x123");
  await assert.rejects(
    () => sendErc20Transfer(bad, { from: WALLET, tokenAddress: TOKEN, transferData: "0x" }),
    (error: unknown) => error instanceof CryptoPaymentError && error.code === "failed"
  );
});

await checkAsync("sendErc20Transfer maps a rejection to 'rejected'", async () => {
  const provider = fakeProvider(() => {
    throw { code: 4001 };
  });
  await assert.rejects(
    () => sendErc20Transfer(provider, { from: WALLET, tokenAddress: TOKEN, transferData: "0x" }),
    (error: unknown) => error instanceof CryptoPaymentError && error.code === "rejected"
  );
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
