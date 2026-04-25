"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { parseXlmToStroops } from "@/lib/formatters";
import {
  getStellarAddressType,
  isValidStellarAddress,
} from "@/lib/stellarAddress";
import { cn } from "./Shimmer";

/** Stellar text memo max is 28 bytes (UTF-8). */
const MEMO_MAX_BYTES = 28;

function memoByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropose: (to: string, amount: bigint, memo: string) => Promise<void>;
  balance: bigint;
  isProposing: boolean;
}

export function WithdrawalModal({
  isOpen,
  onClose,
  onPropose,
  balance,
  isProposing,
}: WithdrawalModalProps) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const balanceXlm = Number(balance) / 10 ** 7;
  const amountNum = Number(amount);
  const normalizedRecipient = to.trim();
  const addressType = getStellarAddressType(normalizedRecipient);
  const isValidAddress = addressType !== null;
  const isValidAmount =
    amount !== "" &&
    !isNaN(amountNum) &&
    amountNum > 0 &&
    amountNum <= balanceXlm;
  const memoBytes = memoByteLength(memo);
  const isMemoValid = memo.trim().length > 0 && memoBytes <= MEMO_MAX_BYTES;
  const isValid = isValidAddress && isValidAmount && isMemoValid;

  const handleClose = () => {
    setTo("");
    setAmount("");
    setMemo("");
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setSubmitError("Please fill in all fields correctly.");
      return;
    }

    try {
      setSubmitError(null);
      const stroops = parseXlmToStroops(amount);
      await onPropose(normalizedRecipient, stroops, memo.trim());
      handleClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to propose withdrawal. Please try again.",
      );
    }
  };

  const addressHint =
    to && !isValidAddress
      ? "Enter a valid Stellar account (G...) or contract (C...) address"
      : addressType === "contract"
        ? "Contract address"
        : addressType === "account"
          ? "Account address"
          : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Propose Withdrawal</h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Recipient */}
          <div className="space-y-1.5">
            <label htmlFor="wd-to" className="text-sm font-medium">
              Recipient Address
            </label>
            <input
              id="wd-to"
              type="text"
              placeholder="G... or C..."
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setSubmitError(null);
              }}
              className={cn(
                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono text-sm",
                to && !isValidAddress
                  ? "border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20",
              )}
              disabled={isProposing}
              autoComplete="off"
              spellCheck={false}
            />
            {addressHint && (
              <p
                className={cn(
                  "text-xs",
                  to && !isValidAddress ? "text-rose-500" : "text-slate-400",
                )}
              >
                {addressHint}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="wd-amount" className="text-sm font-medium">
                Amount
              </label>
              <span className="text-xs text-slate-500">
                Balance: {balanceXlm.toFixed(7)} XLM
              </span>
            </div>
            <div className="relative">
              <input
                id="wd-amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSubmitError(null);
                }}
                className={cn(
                  "w-full px-4 py-3 pr-14 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                  amount && !isValidAmount
                    ? "border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20",
                )}
                disabled={isProposing}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm pointer-events-none">
                XLM
              </span>
            </div>
            {amount && !isValidAmount && (
              <p className="text-xs text-rose-500">
                {amountNum <= 0
                  ? "Amount must be greater than zero"
                  : amountNum > balanceXlm
                    ? "Amount exceeds available balance"
                    : "Enter a valid number"}
              </p>
            )}
          </div>

          {/* Memo */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="wd-memo" className="text-sm font-medium">
                Memo
              </label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  memoBytes > MEMO_MAX_BYTES
                    ? "text-rose-500"
                    : "text-slate-400",
                )}
              >
                {memoBytes}/{MEMO_MAX_BYTES}
              </span>
            </div>
            <input
              id="wd-memo"
              type="text"
              placeholder="Purpose of withdrawal…"
              value={memo}
              onChange={(e) => {
                setMemo(e.target.value);
                setSubmitError(null);
              }}
              className={cn(
                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                memo && !isMemoValid
                  ? "border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20",
              )}
              disabled={isProposing}
            />
            {memo && memoBytes > MEMO_MAX_BYTES && (
              <p className="text-xs text-rose-500">
                Memo exceeds {MEMO_MAX_BYTES}-byte limit (Stellar text memo
                constraint)
              </p>
            )}
            {memo && memo.trim().length === 0 && (
              <p className="text-xs text-rose-500">Memo cannot be blank</p>
            )}
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || isProposing}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex justify-center items-center gap-2"
          >
            {isProposing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Proposing…
              </>
            ) : (
              "Propose Withdrawal"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
