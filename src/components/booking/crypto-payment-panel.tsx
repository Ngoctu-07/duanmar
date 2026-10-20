"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildCryptoQuote,
  buildEvmUri,
  chainName,
  CryptoPaymentError,
  ensureChain,
  explorerTxUrl,
  getInjectedProvider,
  requestAccounts,
  sendErc20Transfer,
  type CryptoConfig,
  type CryptoErrorCode,
  type Eip1193Provider,
} from "@/lib/crypto-payment";
import type { PriceCurrency } from "@/lib/pricing";

interface CryptoPaymentPanelProps {
  config: CryptoConfig | null;
  total: number;
  currency: PriceCurrency;
  /** Fired once per successful on-chain broadcast with the transaction hash. */
  onTxHash: (txHash: string) => void;
}

type Phase = "idle" | "connecting" | "sending" | "success" | "error";

const ERROR_KEY: Record<CryptoErrorCode, string> = {
  "no-provider": "cryptoErrorNoProvider",
  rejected: "cryptoErrorRejected",
  chain: "cryptoErrorChain",
  failed: "cryptoErrorFailed",
};

/**
 * Web3 crypto rail. On desktop with MetaMask it drives the EIP-1193 flow
 * (connect → switch/add chain → ERC-20 transfer) and reports the tx hash; on
 * mobile / non-extension browsers it degrades to a formatted QR deposit panel
 * (address + copy + network/token instructions).
 */
export function CryptoPaymentPanel({
  config,
  total,
  currency,
  onTxHash,
}: CryptoPaymentPanelProps) {
  const t = useTranslations("booking");
  const quote = useMemo(
    () => buildCryptoQuote(config, total, currency),
    [config, total, currency]
  );

  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorCode, setErrorCode] = useState<CryptoErrorCode | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const onTxHashRef = useRef(onTxHash);
  useEffect(() => {
    onTxHashRef.current = onTxHash;
  }, [onTxHash]);

  // SSR-safe: the injected provider only exists after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window.ethereum is unavailable during SSR
    setProvider(getInjectedProvider(window as unknown as { ethereum?: Eip1193Provider }));
  }, []);

  const copyAddress = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config.walletAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions/insecure context) — address stays selectable
    }
  };

  const pay = async () => {
    if (!quote.ok || !config || !provider) {
      setErrorCode(provider ? "failed" : "no-provider");
      setPhase("error");
      return;
    }
    setErrorCode(null);
    setPhase("connecting");
    try {
      const from = await requestAccounts(provider);
      setPhase("sending");
      await ensureChain(provider, config.chainId);
      const hash = await sendErc20Transfer(provider, {
        from,
        tokenAddress: config.tokenAddress,
        transferData: quote.transferData,
      });
      setTxHash(hash);
      setPhase("success");
      onTxHashRef.current(hash);
    } catch (error) {
      setErrorCode(error instanceof CryptoPaymentError ? error.code : "failed");
      setPhase("error");
    }
  };

  if (!config) {
    return (
      <p
        data-testid="crypto-unavailable"
        className="mt-4 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground"
      >
        {t("cryptoUnavailable")}
      </p>
    );
  }

  // Simple EVM payment URI — universally scannable by MetaMask, Trust Wallet,
  // Coinbase Wallet and other mobile Web3 apps. The EIP-681 token-transfer URI
  // (quote.uri) is still used for the actual MetaMask eth_sendTransaction
  // payload, but the QR code carries the plain address so any wallet can scan it.
  const qrValue = buildEvmUri(config.walletAddress, config.chainId);
  const txUrl = txHash ? explorerTxUrl(config.chainId, txHash) : null;

  const deposit = (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="rounded-lg bg-background p-2">
        <QRCodeSVG
          data-testid="crypto-qr"
          value={qrValue}
          size={192}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <div className="flex-1 text-center sm:text-left">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("cryptoDepositAddress")}
        </p>
        <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
          <code
            data-testid="crypto-address"
            className="break-all rounded bg-muted px-2 py-1 text-xs"
          >
            {config.walletAddress}
          </code>
          <Button
            type="button"
            variant="outline"
            size="xs"
            data-testid="crypto-copy"
            onClick={copyAddress}
          >
            {copied ? t("cryptoCopied") : t("cryptoCopy")}
          </Button>
        </div>

        {/* Network & Token Badge — UI parity with MoMo / Bank QR blocks */}
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <span
            data-testid="crypto-network-badge"
            className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {t("cryptoNetwork")}: {chainName(config.chainId)}
          </span>
          <span
            data-testid="crypto-tokens-badge"
            className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {t("cryptoTokens")}: USDT / USDC
          </span>
        </div>

        <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt className="font-medium">{t("cryptoAmount")}:</dt>
            <dd data-testid="crypto-amount" className="tabular-nums">
              {quote.ok ? quote.usdAmount : "—"} {config.tokenSymbol}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{t("cryptoScanHint")}</p>
        {!quote.ok && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("cryptoAmountUnconfirmed")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="crypto-payment-panel" className="mt-4 rounded-lg bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("cryptoIntro", { symbol: config.tokenSymbol, network: chainName(config.chainId) })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {provider && (
            <Button
              type="button"
              data-testid="crypto-pay"
              onClick={pay}
              disabled={
                !quote.ok ||
                phase === "connecting" ||
                phase === "sending" ||
                phase === "success"
              }
            >
              {phase === "connecting"
                ? t("cryptoConnecting")
                : phase === "sending"
                  ? t("cryptoSending")
                  : t("cryptoConnect")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            data-testid="crypto-open-qr"
            onClick={() => setDialogOpen(true)}
          >
            {t("cryptoOpenQr")}
          </Button>
        </div>
      </div>

      {!provider && (
        <p
          data-testid="crypto-no-wallet"
          className="mt-3 rounded bg-background/60 p-3 text-xs text-muted-foreground"
        >
          {t("cryptoNoWallet")}
        </p>
      )}

      <p
        aria-live="polite"
        data-testid="crypto-status"
        className={`mt-3 text-sm ${
          phase === "success" ? "font-bold text-green-600" : "text-muted-foreground"
        }`}
      >
        {phase === "success"
          ? t("cryptoStatusSuccess")
          : phase === "error" && errorCode
            ? t(ERROR_KEY[errorCode])
            : t("cryptoStatusPending")}
      </p>

      {phase === "success" && txHash && (
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">{t("cryptoTxHash")}: </span>
          <code data-testid="crypto-txhash" className="break-all">
            {txHash}
          </code>
          {txUrl && (
            <>
              {" · "}
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-link hover:underline"
              >
                {t("cryptoViewTx")}
              </a>
            </>
          )}
        </p>
      )}

      <div className="mt-4 rounded-lg bg-background/60 p-4">{deposit}</div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-slot="crypto-modal" data-testid="crypto-modal">
          <DialogTitle>{t("cryptoModalTitle")}</DialogTitle>
          <DialogDescription>{t("cryptoModalDescription")}</DialogDescription>
          <div className="mt-4">{deposit}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
