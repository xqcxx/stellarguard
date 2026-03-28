"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  buildDepositTx,
  buildProposeWithdrawalTx,
  buildApproveTx,
  buildExecuteTx,
  CONTRACT_IDS,
  readContractValue,
  signAndSubmit,
} from "@/lib/soroban";
import {
  decodeBigInt,
  decodeTreasuryConfig,
  type TreasuryConfig,
} from "@/lib/contractData";
import {
  createLatestRequestGuard,
  isAbortError,
} from "@/lib/requestGuard";
import { useFreighter } from "./useFreighter";

const REFRESH_INTERVAL = 30_000;

export function useTreasury() {
  const { address } = useFreighter();
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [config, setConfig] = useState<TreasuryConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const requestGuardRef = useRef(createLatestRequestGuard());

  const getErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
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
      }

      return result;
    },
    [address],
  );

  const getBalance = useCallback(async () => {
    const request = requestGuardRef.current.begin();

    try {
      const result = await fetchBalance(request.id, request.signal);

      if (requestGuardRef.current.isCurrent(request.id)) {
        setError(null);
      }

      return result;
    } catch (err: unknown) {
      if (isAbortError(err)) {
        throw err;
      }

      if (requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to fetch balance"));
      }

      throw err;
    }
  }, [fetchBalance, getErrorMessage]);

  const getConfig = useCallback(async () => {
    const request = requestGuardRef.current.begin();

    try {
      const result = await fetchConfig(request.id, request.signal);

      if (requestGuardRef.current.isCurrent(request.id)) {
        setError(null);
      }

      return result;
    } catch (err: unknown) {
      if (isAbortError(err)) {
        throw err;
      }

      if (requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to fetch config"));
      }

      throw err;
    }
  }, [fetchConfig, getErrorMessage]);

  const refresh = useCallback(async () => {
    const request = requestGuardRef.current.begin();

    if (requestGuardRef.current.isCurrent(request.id)) {
      setIsLoading(true);
      setError(null);
    }

    try {
      await Promise.all([
        fetchBalance(request.id, request.signal),
        fetchConfig(request.id, request.signal),
      ]);
    } catch (err) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to refresh treasury data"));
      }
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  }, [fetchBalance, fetchConfig, getErrorMessage]);

  const deposit = async (amount: number): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildDepositTx(CONTRACT_IDS.treasury, address, amount);
      const built = tx.build();
      await signAndSubmit(built);
      await fetchBalance(request.id, request.signal);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Deposit failed"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const proposeWithdrawal = async (
    to: string,
    amount: number,
    memo: string,
  ): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildProposeWithdrawalTx(
        CONTRACT_IDS.treasury,
        address,
        to,
        amount,
        memo,
      );
      const built = tx.build();
      await signAndSubmit(built);
      await fetchConfig(request.id, request.signal);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Propose withdrawal failed"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const approve = async (txId: number): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildApproveTx(CONTRACT_IDS.treasury, address, txId);
      const built = tx.build();
      await signAndSubmit(built);
      await Promise.all([
        fetchBalance(request.id, request.signal),
        fetchConfig(request.id, request.signal),
      ]);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Approve failed"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const execute = async (txId: number): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildExecuteTx(CONTRACT_IDS.treasury, address, txId);
      const built = tx.build();
      await signAndSubmit(built);
      await Promise.all([
        fetchBalance(request.id, request.signal),
        fetchConfig(request.id, request.signal),
      ]);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Execute failed"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      requestGuardRef.current.cancel("Treasury refresh cancelled.");
    };
  }, [refresh]);

  useEffect(() => {
    return () => {
      requestGuardRef.current.dispose();
    };
  }, []);

  return {
    balance,
    config,
    isLoading,
    error,
    getBalance,
    getConfig,
    deposit,
    proposeWithdrawal,
    approve,
    execute,
    refresh,
  };
}
