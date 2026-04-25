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
import { createLatestRequestGuard, isAbortError } from "@/lib/requestGuard";
import { classifyError, type AppError } from "@/lib/errors";
import { useFreighter } from "./useFreighter";
import { usePageVisibility } from "./usePageVisibility";

const REFRESH_INTERVAL = 30_000;

/**
 * Represents a locally-pending vote that has been submitted but not yet
 * confirmed on chain. Used to drive optimistic UI updates.
 */
export interface PendingVote {
  proposalId: number;
  voteFor: boolean;
}

export function useGovernance() {
  const { address } = useFreighter();
  const isPageVisible = usePageVisibility();
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  // Maps proposalId → voteFor for votes that are in-flight.
  // UI reads this to reflect intent before chain confirmation.
  const [pendingVotes, setPendingVotes] = useState<
    ReadonlyMap<number, boolean>
  >(new Map());

  const requestGuardRef = useRef(createLatestRequestGuard());

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
        setError(classifyError(err));
      }

      throw err;
    }
  }, [fetchConfig]);

  const clearPendingVote = useCallback((proposalId: number) => {
    setPendingVotes((prev: ReadonlyMap<number, boolean>) => {
      if (!prev.has(proposalId)) {
        return prev;
      }

      const next = new Map(Array.from(prev));
      next.delete(proposalId);
      return next;
    });
  }, []);

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
          setError(classifyError(err));
        }

        throw err;
      }
    },
    [address],
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
        setError(classifyError(err));
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

    // Optimistically record the pending vote so the UI reflects intent
    // instantly — the counter updates before the chain confirms.
    setPendingVotes(
      (prev: ReadonlyMap<number, boolean>) =>
        new Map(Array.from(prev).concat([[proposalId, voteFor]])),
    );

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
      // Rollback: remove the optimistic entry so the UI reverts to real data.
      clearPendingVote(proposalId);

      if (!isAbortError(err) && requestGuardRef.current.isCurrent(request.id)) {
        setError(classifyError(err));
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
        setError(classifyError(err));
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
        setError(classifyError(err));
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
          setError(classifyError(err));
        }

        throw err;
      }
    },
    [address],
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
        setError(classifyError(err));
      }
    } finally {
      if (requestGuardRef.current.isCurrent(request.id)) {
        setIsLoading(false);
      }
    }
  }, [fetchConfig]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      // Pause polling while the tab is hidden to avoid unnecessary RPC calls.
      if (isPageVisible) {
        refresh();
      }
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      requestGuardRef.current.cancel("Governance refresh cancelled.");
    };
  }, [refresh, isPageVisible]);

  useEffect(() => {
    return () => {
      requestGuardRef.current.dispose();
    };
  }, []);

  return {
    config,
    isLoading,
    error,
    /**
     * Map of proposalId → voteFor for votes currently in-flight.
     * Use for optimistic UI — read this to reflect user intent
     * before the chain confirms.
     */
    pendingVotes,
    clearPendingVote,
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
