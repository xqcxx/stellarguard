"use client";

import React, { useState } from 'react';
import { cn } from './Shimmer';
import { X } from 'lucide-react';
import { parseXlmToStroops } from '@/lib/formatters';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropose: (to: string, amount: number, memo: string) => Promise<void>;
  balance: bigint;
  isProposing: boolean;
}

export function WithdrawalModal({ isOpen, onClose, onPropose, balance, isProposing }: WithdrawalModalProps) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const balanceXlm = Number(balance) / 10 ** 7;
  const amountNum = Number(amount);
  const isValidAddress = to.startsWith('G') && to.length === 56;
  const isValidAmount = !isNaN(amountNum) && amountNum > 0 && amountNum <= balanceXlm;
  const isValid = isValidAddress && isValidAmount && memo.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Please fill in all fields correctly.");
      return;
    }

    try {
      setError(null);
      const stroops = parseXlmToStroops(amount);
      await onPropose(to, stroops, memo.trim());
      onClose();
      // Reset form
      setTo('');
      setAmount('');
      setMemo('');
    } catch (err: any) {
      setError(err.message || "Failed to propose withdrawal. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Propose Withdrawal</h2>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="to" className="text-sm font-medium">Recipient Address</label>
            <input
              id="to"
              type="text"
              placeholder="G..."
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                if (error) setError(null);
              }}
              className={cn(
                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                error && !isValidAddress ? "border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
              )}
              disabled={isProposing}
            />
            {to && !isValidAddress && <p className="text-sm text-rose-500">Invalid Stellar address</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="amount" className="text-sm font-medium">Amount to Withdraw</label>
              <span className="text-xs text-slate-500">Balance: {balanceXlm.toFixed(7)} XLM</span>
            </div>
            <div className="relative">
              <input
                id="amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                  error && !isValidAmount ? "border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                )}
                disabled={isProposing}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                XLM
              </div>
            </div>
            {amount && !isValidAmount && <p className="text-sm text-rose-500">Amount must be positive and not exceed balance</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="memo" className="text-sm font-medium">Memo (Description)</label>
            <input
              id="memo"
              type="text"
              placeholder="Purpose of withdrawal..."
              value={memo}
              onChange={(e) => {
                setMemo(e.target.value);
                if (error) setError(null);
              }}
              className={cn(
                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                error && !memo.trim() ? "border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
              )}
              disabled={isProposing}
            />
            {memo && !memo.trim() && <p className="text-sm text-rose-500">Memo is required</p>}
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={!isValid || isProposing}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex justify-center items-center gap-2"
          >
            {isProposing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Proposing...
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