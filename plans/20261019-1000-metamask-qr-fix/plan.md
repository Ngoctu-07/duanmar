# MetaMask / Web3 Crypto QR Code Fix

## Status
- Planning: COMPLETE
- Implementation: COMPLETE
- Testing: COMPLETE

## Summary of Changes

### 1. `src/lib/crypto-payment.ts`
- Added `buildEvmUri(walletAddress, chainId?)` — generates universally compatible EVM payment URI (`ethereum:${address}@${chainId}` or `ethereum:${address}`)
- Added `CmsPaymentSettings` interface for CMS payment settings shape
- Added `resolveCryptoConfigFromCms(cms, env)` — resolves CryptoConfig from CMS settings with env var fallback

### 2. `src/sanity/schemaTypes/site-configuration.ts`
- Added `paymentSettings` object field with:
  - `cryptoWalletAddress` — primary EVM deposit wallet address
  - `metamaskWalletAddress` — alternative MetaMask-specific address (falls back to cryptoWalletAddress)
- Both fields have EVM address validation (0x + 40 hex chars)

### 3. `src/sanity/queries/site-configuration.ts`
- Added `paymentSettings { cryptoWalletAddress, metamaskWalletAddress }` to GROQ query

### 4. `src/app/[locale]/booking/checkout/page.tsx`
- Fetches `SITE_CONFIGURATION_QUERY` alongside destination and pricing
- CMS wallet address takes priority over env vars, falls back to `NEXT_PUBLIC_CRYPTO_WALLET_ADDRESS`
- Fail-open: if Sanity is unreachable, `fetchPublished` returns null and env vars are used

### 5. `src/components/booking/crypto-payment-panel.tsx`
- Replaced `QRCode.toDataURL()` (data URL `` tag) with `QRCodeSVG` from `qrcode.react` (inline SVG)
- QR payload now uses `buildEvmUri(config.walletAddress, config.chainId)` — simple `ethereum:${address}@${chainId}` format universally scannable by MetaMask, Trust Wallet, Coinbase Wallet
- EIP-681 token-transfer URI (`quote.uri`) still used for the actual MetaMask `eth_sendTransaction` payload
- Removed QR loading state (SVG renders instantly)
- Added Network & Token Badge below QR (UI parity with MoMo/Bank blocks)
- Amount displays "—" when quote is unconfigured (VND without rate)
- Added `cryptoAmountUnconfirmed` hint when quote is not ok
- Pay button disabled when `!quote.ok`
- Early return condition simplified: `!config` → shows `cryptoUnavailable` fallback message

### 6. `src/messages/en.json` & `src/messages/vi.json`
- Added `cryptoAmountUnconfirmed` key (both locales, parity maintained)

### Test Results
- TypeScript: `tsc --noEmit` — clean, no errors
- `crypto-payment.test.mts`: 22/22 passed
- `payment-logic.test.ts`: 9/9 passed
- `payment-note.test.ts`: 3/3 passed (individually)
- `i18n-parity.test.ts`: en=800 vi=800, 0 missing keys
- Dev server: running at http://localhost:3000
