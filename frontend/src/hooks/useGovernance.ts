"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { nativeToScVal, Address } from "@stellar/stellar-sdk";
import {
  CONTRACT_IDS,
  readContractValue,
  signAndSubmit,
  buildCreateProposalTx,
  buildVoteTx,
  buildFinalizeTx,
  buildExecuteProposalTx,
} from "@/lib/soroban";
import {
  decodeBoolean,
  decodeGovernanceConfig,
  decodeGovernanceProposal,
  type GovernanceConfig,
  type GovernanceProposal,
  type GovernanceProposalAction,
} from "@/lib/contractData";
import {
  createLatestRequestGuard,
  isAbortError,
} from "@/lib/requestGuard";
import { useFreighter } from "./useFreighter";

const REFRESH_INTERVAL = 30_000;

export function useGovernance() {
  const { address } = useFreighter();
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const requestGuardRef = useRef(createLatestRequestGuard());

  const getErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  }, []);

  const fetchConfig = useCallback(
    async (requestId: number, signal: AbortSignal) => {
      const result = await readContractValue(
        CONTRACT_IDS.governance,
        "get_config",
        [],
        {
          decoder: decodeGovernanceConfig,
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
        setError(getErrorMessage(err, "Failed to fetch governance config"));
      }

      throw err;
    }
  }, [fetchConfig, getErrorMessage]);

  const getProposal = useCallback(
    async (id: number): Promise<GovernanceProposal> => {
      const request = requestGuardRef.current.begin();

      if (requestGuardRef.current.isCurrent(request.id)) {
        setError(null);
      }

      try {
        return await readContractValue(
          CONTRACT_IDS.governance,
          "get_proposal",
          [nativeToScVal(id, { type: "u64" })],
          {
            decoder: decodeGovernanceProposal,
            signal: request.signal,
            sourceAddress: address ?? undefined,
          },
        );
      } catch (err: unknown) {
        if (isAbortError(err)) {
          throw err;
        }

        if (requestGuardRef.current.isCurrent(request.id)) {
          setError(getErrorMessage(err, "Failed to fetch proposal"));
        }

        throw err;
      }
    },
    [address, getErrorMessage],
  );

  const createProposal = async (
    title: string,
    description: string,
    action: GovernanceProposalAction,
    amount: number,
    target: string,
  ): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildCreateProposalTx(
        CONTRACT_IDS.governance,
        address,
        title,
        description,
        action,
        amount,
        target,
      );
      const built = tx.build();
      await signAndSubmit(built);
      await fetchConfig(request.id, request.signal);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to create proposal"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const vote = async (proposalId: number, voteFor: boolean): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildVoteTx(
        CONTRACT_IDS.governance,
        address,
        proposalId,
        voteFor,
      );
      const built = tx.build();
      await signAndSubmit(built);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to vote"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const finalize = async (proposalId: number): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildFinalizeTx(
        CONTRACT_IDS.governance,
        address,
        proposalId,
      );
      const built = tx.build();
      await signAndSubmit(built);
      await fetchConfig(request.id, request.signal);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to finalize proposal"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const executeProposal = async (proposalId: number): Promise<void> => {
    if (!address) throw new Error("Wallet not connected");

    const request = requestGuardRef.current.begin();
    setError(null);
    setIsLoading(true);

    try {
      const tx = await buildExecuteProposalTx(
        CONTRACT_IDS.governance,
        address,
        proposalId,
      );
      const built = tx.build();
      await signAndSubmit(built);
      await fetchConfig(request.id, request.signal);
    } catch (err: unknown) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to execute proposal"));
      }

      throw err;
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  };

  const hasVoted = useCallback(
    async (proposalId: number): Promise<boolean> => {
      if (!address) throw new Error("Wallet not connected");

      const request = requestGuardRef.current.begin();

      if (requestGuardRef.current.isCurrent(request.id)) {
        setError(null);
      }

      try {
        return await readContractValue(
          CONTRACT_IDS.governance,
          "has_voted",
          [
            nativeToScVal(proposalId, { type: "u64" }),
            nativeToScVal(Address.fromString(address), { type: "address" }),
          ],
          {
            decoder: decodeBoolean,
            signal: request.signal,
            sourceAddress: address,
          },
        );
      } catch (err: unknown) {
        if (isAbortError(err)) {
          throw err;
        }

        if (requestGuardRef.current.isCurrent(request.id)) {
          setError(getErrorMessage(err, "Failed to check vote status"));
        }

        throw err;
      }
    },
    [address, getErrorMessage],
  );

  const refresh = useCallback(async () => {
    const request = requestGuardRef.current.begin();

    if (requestGuardRef.current.isCurrent(request.id)) {
      setIsLoading(true);
      setError(null);
    }

    try {
      await fetchConfig(request.id, request.signal);
    } catch (err) {
      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(getErrorMessage(err, "Failed to refresh governance data"));
      }
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  }, [fetchConfig, getErrorMessage]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      requestGuardRef.current.cancel("Governance refresh cancelled.");
    };
  }, [refresh]);

  useEffect(() => {
    return () => {
      requestGuardRef.current.dispose();
    };
  }, []);

  return {
    config,
    isLoading,
    error,
    getConfig,
    getProposal,
    createProposal,
    vote,
    finalize,
    executeProposal,
    hasVoted,
    refresh,
  };
}
