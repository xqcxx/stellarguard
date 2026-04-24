"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { VoteButton } from "@/components/VoteButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useGovernance } from "@/hooks/useGovernance";
import type { GovernanceProposal } from "@/lib/contractData";

export default function ProposalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number.parseInt(params.id, 10);
  const { getProposal, finalize, getConfig, isLoading } = useGovernance();
  const [proposal, setProposal] = useState<GovernanceProposal | null>(null);
  const [countdown, setCountdown] = useState("Unknown");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const loadProposal = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    await getConfig();
    const p = await getProposal(id);
    setProposal(p);
  }, [getConfig, getProposal, id]);

  useEffect(() => {
    loadProposal().catch(() => {
      toast.error("Failed to load proposal details");
    });
  }, [loadProposal]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!proposal) return;
    const endMs = proposal.endsAt * 1000;
    const diff = endMs - nowMs;
    if (diff <= 0) {
      setCountdown("Voting window closed");
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s remaining`);
  }, [proposal, nowMs]);

  const totalVotes = (proposal?.votesFor ?? 0) + (proposal?.votesAgainst ?? 0);
  const forPercent = totalVotes > 0 ? ((proposal?.votesFor ?? 0) / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? ((proposal?.votesAgainst ?? 0) / totalVotes) * 100 : 0;
  const canFinalize = useMemo(() => {
    if (!proposal) return false;
    return proposal.status === "Active" && proposal.endsAt * 1000 <= nowMs;
  }, [proposal, nowMs]);

  const handleCopyLink = async () => {
    const title = proposal?.title ?? `Proposal #${params.id}`;
    const shareUrl = `${window.location.origin}/proposals/${params.id}?title=${encodeURIComponent(title)}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied");
  };

  const handleFinalize = async () => {
    if (!proposal || !canFinalize || isFinalizing) return;
    setIsFinalizing(true);
    const toastId = toast.loading("Finalizing proposal...");
    try {
      await finalize(id);
      await loadProposal();
      toast.success("Proposal finalized", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to finalize proposal", { id: toastId });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-8 pb-32 md:pb-0">
      {/* Back Link */}
      <Link
        href="/governance"
        className="text-primary-400 hover:text-primary-300 text-sm"
      >
        ← Back to Governance
      </Link>

      {/* Proposal Header */}
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">
                {proposal?.title ?? `Proposal #${params.id}`}
              </h1>
              <StatusBadge status={proposal?.status ?? "Active"} size="md" />
            </div>
            <p className="text-gray-400 mt-2">{proposal?.description ?? "Loading proposal details..."}</p>
            {proposal ? (
              <p className="text-xs text-gray-500 mt-2">
                Ends at{" "}
                {new Date(proposal.endsAt * 1000).toLocaleString(undefined, {
                  timeZoneName: "short",
                })}{" "}
                ({countdown})
              </p>
            ) : null}
          </div>
          <button className="btn-secondary" onClick={handleCopyLink} type="button">
            Copy Share Link
          </button>
        </div>
      </div>

      {/* Voting Progress */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          Voting Progress
        </h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-400">For</span>
              <span className="text-gray-400">{proposal?.votesFor ?? 0} votes</span>
            </div>
            <div className="w-full bg-stellar-border rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${forPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-400">Against</span>
              <span className="text-gray-400">{proposal?.votesAgainst ?? 0} votes</span>
            </div>
            <div className="w-full bg-stellar-border rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${againstPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Finalize Proposal</h2>
          <p className="text-sm text-gray-400">
            Finalization unlocks execution when proposal voting has ended.
          </p>
          {!canFinalize && proposal ? (
            <p className="text-xs text-yellow-400 mt-1">
              Available after deadline while status is Active.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={`btn-primary ${!canFinalize || isFinalizing || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!canFinalize || isFinalizing || isLoading}
          onClick={handleFinalize}
        >
          {isFinalizing ? "Finalizing..." : "Finalize"}
        </button>
      </div>

      {/* Vote Actions (Sticky on Mobile) */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gray-900 border-t border-stellar-border z-50 md:relative md:p-0 md:bg-transparent md:border-t-0 md:z-auto card md:card">
        <h2 className="hidden md:block text-lg font-semibold text-white mb-4">Cast Vote</h2>
        <div className="flex space-x-4">
          <VoteButton proposalId={id} voteFor={true} votingClosed={proposal ? proposal.endsAt * 1000 <= nowMs : false} />
          <VoteButton proposalId={id} voteFor={false} votingClosed={proposal ? proposal.endsAt * 1000 <= nowMs : false} />
        </div>
      </div>
    </div>
  );
}
