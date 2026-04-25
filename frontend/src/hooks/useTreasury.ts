"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nativeToScVal } from "@stellar/stellar-sdk";
import {
  buildApproveTx,
  buildDepositTx,
  buildExecuteTx,
  buildProposeWithdrawalTx,
  CONTRACT_IDS,
  readContractValue,
  signAndSubmit,
} from "@/lib/soroban";
import {
  decodeBigInt,
  decodeTreasuryConfig,
  decodeTreasuryTransaction,
  type TreasuryConfig,
  type TreasuryTransaction,
} from "@/lib/contractData";
import { classifyError, type AppError } from "@/lib/errors";
import { createLatestRequestGuard, isAbortError } from "@/lib/requestGuard";
import { isWalletNetworkMismatch } from "@/lib/network";
import {
  MOCK_TREASURY_CONFIG,
  MOCK_TREASURY_TRANSACTIONS,
} from "@/lib/treasuryMocks";
import { useFreighter } from "./useFreighter";

const REFRESH_INTERVAL = 30_000;
const MAX_VISIBLE_TRANSACTIONS = 20;
const IS_TREASURY_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK_TREASURY === "1";

type TxAction = "approve" | "execute";

export function useTreasury() {
  const { address, network } = useFreighter();
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [config, setConfig] = useState<TreasuryConfig | null>(null);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [txActions, setTxActions] = useState<ReadonlyMap<number, TxAction>>(
    new Map(),
  );
  const [isProposing, setIsProposing] = useState(false);

  const requestGuardRef = useRef(createLatestRequestGuard());
  const txCounterRef = useRef(MOCK_TREASURY_CONFIG.txCount);

  const isNetworkMismatch = useMemo(
    () => isWalletNetworkMismatch(network),
    [network],
  );

  const setTxAction = useCallback((txId: number, action: TxAction | null) => {
    setTxActions((previous) => {
      const next = new Map(previous);
      if (action) {
        next.set(txId, action);
      } else {
        next.delete(txId);
      }
      return next;
    });
  }, []);

  const fetchBalance = useCallback(
    async (requestId: number, signal: AbortSignal) => {
      const result = await readContractValue(
        CONTRACT_IDS.treasury,
        "get_balance",
        [],
        {
          decoder: decodeBigInt,
          signal,
          sourceAddress: address ?? undefined,
        },
      );

      if (requestGuardRef.current.isCurrent(requestId)) {
        setBalance(result);
      }

      return result;
    },
    [address],
  );

  const fetchConfig = useCallback(
    async (requestId: number, signal: AbortSignal) => {
      const result = await readContractValue(
        CONTRACT_IDS.treasury,
        "get_config",
        [],
        {
          decoder: decodeTreasuryConfig,
          signal,
          sourceAddress: address ?? undefined,
        },
      );

      if (requestGuardRef.current.isCurrent(requestId)) {
        setConfig(result);
        setBalance(result.balance);
      }

      return result;
    },
    [address],
  );

  const fetchTransaction = useCallback(
    async (transactionId: number, signal: AbortSignal) => {
      return readContractValue(
        CONTRACT_IDS.treasury,
        "get_transaction",
        [nativeToScVal(transactionId, { type: "u64" })],
        {
          decoder: decodeTreasuryTransaction,
          signal,
          sourceAddress: address ?? undefined,
        },
      );
    },
    [address],
  );

  const fetchTransactions = useCallback(
    async (requestId: number, signal: AbortSignal, txCount: number) => {
      if (txCount <= 0) {
        if (requestGuardRef.current.isCurrent(requestId)) {
          setTransactions([]);
        }
        return [];
      }

      const firstId = Math.max(1, txCount - MAX_VISIBLE_TRANSACTIONS + 1);
      const ids = Array.from(
        { length: txCount - firstId + 1 },
        (_, index) => txCount - index,
      );

      const results = await Promise.all(
        ids.map((transactionId) => fetchTransaction(transactionId, signal)),
      );

      if (requestGuardRef.current.isCurrent(requestId)) {
        setTransactions(results);
      }

      return results;
    },
    [fetchTransaction],
  );

  const refresh = useCallback(async () => {
    if (IS_TREASURY_MOCK_MODE) {
      setIsLoading(false);
      setError(null);
      setConfig({
        ...MOCK_TREASURY_CONFIG,
        txCount: txCounterRef.current,
      });
      setBalance(MOCK_TREASURY_CONFIG.balance);
      setTransactions((current) =>
        current.length > 0 ? current : MOCK_TREASURY_TRANSACTIONS,
      );
      return;
    }

    const request = requestGuardRef.current.begin();

    if (requestGuardRef.current.isCurrent(request.id)) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const [currentBalance, currentConfig] = await Promise.all([
        fetchBalance(request.id, request.signal),
        fetchConfig(request.id, request.signal),
      ]);

      await fetchTransactions(request.id, request.signal, currentConfig.txCount);

      if (requestGuardRef.current.isCurrent(request.id)) {
        setBalance(currentConfig.balance ?? currentBalance);
      }
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(classifyError(err));
      }
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  }, [fetchBalance, fetchConfig, fetchTransactions]);

  const assertWalletReady = useCallback(() => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    if (isNetworkMismatch) {
      throw new Error("Wallet network mismatch");
    }
  }, [address, isNetworkMismatch]);

  const deposit = useCallback(
    async (amount: bigint | number): Promise<void> => {
      assertWalletReady();
      const walletAddress = address as string;
      setError(null);

      try {
        const txBuilder = await buildDepositTx(
          CONTRACT_IDS.treasury,
          walletAddress,
          amount,
        );
        await signAndSubmit(txBuilder.build());
        await refresh();
      } catch (err: unknown) {
        const appError = classifyError(err);
        setError(appError);
        throw appError;
      }
    },
    [address, assertWalletReady, refresh],
  );

  const proposeWithdrawal = useCallback(
    async (to: string, amount: bigint | number, memo: string): Promise<void> => {
      if (IS_TREASURY_MOCK_MODE) {
        const amountBigInt = typeof amount === "bigint" ? amount : BigInt(amount);
        const nextId = txCounterRef.current + 1;
        txCounterRef.current = nextId;
        setTransactions((current) => [
          {
            id: nextId,
            to,
            amount: amountBigInt,
            memo,
            approvals: address ? [address] : [],
            executed: false,
            createdAt: Math.floor(Date.now() / 1000),
            proposer: address ?? "",
          },
          ...current,
        ]);
        setConfig((current) =>
          current
            ? {
                ...current,
                txCount: nextId,
              }
            : current,
        );
        return;
      }

      assertWalletReady();
      const walletAddress = address as string;
      setError(null);
      setIsProposing(true);

      try {
        const txBuilder = await buildProposeWithdrawalTx(
          CONTRACT_IDS.treasury,
          walletAddress,
          to,
          amount,
          memo,
        );
        await signAndSubmit(txBuilder.build());
        await refresh();
      } catch (err: unknown) {
        const appError = classifyError(err);
        setError(appError);
        throw appError;
      } finally {
        setIsProposing(false);
      }
    },
    [address, assertWalletReady, refresh],
  );

  const approve = useCallback(
    async (txId: number): Promise<void> => {
      if (IS_TREASURY_MOCK_MODE) {
        if (!address) {
          throw new Error("Wallet not connected");
        }
        setTransactions((current) =>
          current.map((transaction) => {
            if (transaction.id !== txId || transaction.executed) {
              return transaction;
            }
            if (transaction.approvals.includes(address)) {
              return transaction;
            }
            return {
              ...transaction,
              approvals: [...transaction.approvals, address],
            };
          }),
        );
        return;
      }

      assertWalletReady();
      const walletAddress = address as string;
      setError(null);
      setTxAction(txId, "approve");

      const tx = transactions.find((transaction) => transaction.id === txId);
      if (!tx) {
        setTxAction(txId, null);
        throw new Error("Transaction not found");
      }
      if (tx.executed) {
        setTxAction(txId, null);
        throw new Error("Cannot approve an executed transaction");
      }
      if (
        tx.approvals.some(
          (approver) => approver.toLowerCase() === walletAddress.toLowerCase(),
        )
      ) {
        setTxAction(txId, null);
        throw new Error("You already approved this transaction");
      }
      if (tx.approvals.length >= (config?.threshold ?? Number.MAX_SAFE_INTEGER)) {
        setTxAction(txId, null);
        throw new Error("Approval threshold already met");
      }

      const snapshot = transactions;
      setTransactions((current) =>
        current.map((transaction) => {
          if (
            transaction.id !== txId ||
            transaction.approvals.includes(walletAddress)
          ) {
            return transaction;
          }

          return {
            ...transaction,
            approvals: [...transaction.approvals, walletAddress],
          };
        }),
      );

      try {
        const txBuilder = await buildApproveTx(
          CONTRACT_IDS.treasury,
          walletAddress,
          txId,
        );
        await signAndSubmit(txBuilder.build());
        await refresh();
      } catch (err: unknown) {
        setTransactions(snapshot);
        const appError = classifyError(err);
        setError(appError);
        throw appError;
      } finally {
        setTxAction(txId, null);
      }
    },
    [address, assertWalletReady, config?.threshold, refresh, setTxAction, transactions],
  );

  const execute = useCallback(
    async (txId: number): Promise<void> => {
      if (IS_TREASURY_MOCK_MODE) {
        setTransactions((current) =>
          current.map((transaction) =>
            transaction.id === txId
              ? {
                  ...transaction,
                  executed: true,
                }
              : transaction,
          ),
        );
        return;
      }

      assertWalletReady();
      const walletAddress = address as string;
      setError(null);
      setTxAction(txId, "execute");

      try {
        const txBuilder = await buildExecuteTx(
          CONTRACT_IDS.treasury,
          walletAddress,
          txId,
        );
        await signAndSubmit(txBuilder.build());
        await refresh();
      } catch (err: unknown) {
        const appError = classifyError(err);
        setError(appError);
        throw appError;
      } finally {
        setTxAction(txId, null);
      }
    },
    [address, assertWalletReady, refresh, setTxAction],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const requestGuard = requestGuardRef.current;
    refresh();

    const interval = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      requestGuard.cancel("Treasury refresh cancelled.");
    };
  }, [refresh]);

  useEffect(() => {
    const requestGuard = requestGuardRef.current;
    return () => {
      requestGuard.dispose();
    };
  }, []);

  return {
    address,
    balance,
    config,
    transactions,
    isLoading,
    error,
    isNetworkMismatch,
    pendingActions: txActions,
    isProposing,
    deposit,
    proposeWithdrawal,
    approve,
    execute,
    refresh,
    clearError,
  };
}
