"use client";

import { useMemo, useState } from "react";
import { Networks, Operation, TransactionBuilder, Horizon, BASE_FEE, Asset, Memo } from "@stellar/stellar-sdk";
import { signTransaction, requestAccess } from "@stellar/freighter-api";
import { CheckCircle2, Loader2, Wallet, XCircle } from "lucide-react";
import TransactionStatusAnimation from "./TransactionStatusAnimation";

interface XLMCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountXLM: string;
  merchantAddress?: string;
  memo?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (message: string) => void;
}

const HORIZON_URL = process.env.NEXT_PUBLIC_VITE_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const DEFAULT_MERCHANT_ADDRESS = process.env.NEXT_PUBLIC_CHECKOUT_MERCHANT_ADDRESS ?? "";

function getSignedXdr(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const maybe = result as { signedTxXdr?: string; signedTransaction?: string };
    if (maybe.signedTxXdr) return maybe.signedTxXdr;
    if (maybe.signedTransaction) return maybe.signedTransaction;
  }
  throw new Error("Freighter did not return a signed transaction.");
}

export default function XLMCheckoutModal({
  isOpen,
  onClose,
  amountXLM,
  merchantAddress = DEFAULT_MERCHANT_ADDRESS,
  memo = "StellarProof checkout",
  onSuccess,
  onError,
}: XLMCheckoutModalProps) {
  const [status, setStatus] = useState<"idle" | "signing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const networkFeeXLM = useMemo(() => (Number(BASE_FEE) / 10_000_000).toFixed(7), []);
  const totalXLM = useMemo(() => (Number(amountXLM) + Number(networkFeeXLM)).toFixed(7), [amountXLM, networkFeeXLM]);

  if (!isOpen) return null;

  const handlePayment = async () => {
    setStatus("signing");
    setMessage("Waiting for Freighter signature…");
    setTxHash(null);

    try {
      if (!merchantAddress) throw new Error("Checkout merchant address is not configured.");

      const access = await requestAccess();
      if (access.error || !access.address) throw new Error(access.error?.message ?? "Freighter wallet access was denied.");

      const server = new Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(access.address);
      const transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(Operation.payment({ destination: merchantAddress, asset: Asset.native(), amount: amountXLM }))
        .addMemo(Memo.text(memo.slice(0, 28)))
        .setTimeout(60)
        .build();

      const signedResult = await signTransaction(transaction.toXDR(), { address: access.address, networkPassphrase: NETWORK_PASSPHRASE });
      const signedTransaction = TransactionBuilder.fromXDR(getSignedXdr(signedResult), NETWORK_PASSPHRASE);
      const submitted = await server.submitTransaction(signedTransaction);

      setTxHash(submitted.hash);
      setStatus("success");
      setMessage("Payment submitted successfully.");
      onSuccess?.(submitted.hash);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to complete payment.";
      setStatus("error");
      setMessage(nextMessage);
      onError?.(nextMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="xlm-checkout-title">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-[#08111f]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Pay with Freighter</p>
            <h2 id="xlm-checkout-title" className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">XLM checkout</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Review your total, then sign the Stellar payment in Freighter.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Close checkout"><XCircle className="h-5 w-5" /></button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between py-2 text-sm"><span className="text-gray-500 dark:text-gray-400">Amount</span><span className="font-semibold text-gray-900 dark:text-white">{amountXLM} XLM</span></div>
          <div className="flex items-center justify-between py-2 text-sm"><span className="text-gray-500 dark:text-gray-400">Network fee</span><span className="font-semibold text-gray-900 dark:text-white">{networkFeeXLM} XLM</span></div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-white/10"><span className="font-semibold text-gray-900 dark:text-white">Total</span><span className="text-xl font-bold text-primary">{totalXLM} XLM</span></div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
            {(status === "success" || status === "error") && (
              <div className="mb-3 flex justify-center">
                <TransactionStatusAnimation status={status} size={52} />
              </div>
            )}
            <p className={status === "success" ? "text-center font-medium text-emerald-600 dark:text-emerald-400" : status === "error" ? "text-center text-red-600 dark:text-red-400" : ""}>
              {message}
            </p>
            {txHash && (
              <p className="mt-2 break-all text-center font-mono text-xs text-emerald-600 dark:text-emerald-400">
                Tx: {txHash}
              </p>
            )}
          </div>
        )}

        <button type="button" onClick={handlePayment} disabled={status === "signing" || status === "success"} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70">
          {status === "signing" ? <Loader2 className="h-5 w-5 animate-spin" /> : status === "success" ? <CheckCircle2 className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
          {status === "success" ? "Payment complete" : status === "signing" ? "Opening Freighter" : "Sign and pay with XLM"}
        </button>
      </div>
    </div>
  );
}
