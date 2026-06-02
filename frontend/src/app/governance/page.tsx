"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useGovernance } from "@/hooks/useGovernance";
import { useFreighter } from "@/hooks/useFreighter";
import type {
  GovernanceProposal,
  GovernanceProposalAction,
  GovernanceProposalStatus,
} from "@/lib/contractData";

const STATUS_FILTERS: Array<"All" | GovernanceProposalStatus> = [
  "All",
  "Active",
  "Passed",
  "Rejected",
  "Executed",
  "Expired",
];

const ACTION_FILTERS: Array<"All" | GovernanceProposalAction> = [
  "All",
  "Funding",
  "PolicyChange",
  "AddMember",
  "RemoveMember",
  "General",
];

type SortKey = "newest" | "ending-soon" | "most-votes";

const ProposalCard = dynamic(() =>
  import("@/components/ProposalCard").then((module) => module.ProposalCard),
);
const CreateProposalModal = dynamic(() =>
  import("@/components/CreateProposalModal").then(
    (module) => module.CreateProposalModal,
  ),
);
const StatsCardSkeleton = dynamic(() =>
  import("@/components/Skeletons").then((module) => module.StatsCardSkeleton),
);
const ListCardSkeleton = dynamic(() =>
  import("@/components/Skeletons").then((module) => module.ListCardSkeleton),
);

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "ending-soon", label: "Ending Soon" },
  { value: "most-votes", label: "Most Votes" },
];

function sortProposals(proposals: GovernanceProposal[], sort: SortKey): GovernanceProposal[] {
  const copy = [...proposals];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "ending-soon":
      return copy.sort((a, b) => {
        const now = Math.floor(Date.now() / 1000);
        const aEnds = a.endsAt > now ? a.endsAt : Number.MAX_SAFE_INTEGER;
        const bEnds = b.endsAt > now ? b.endsAt : Number.MAX_SAFE_INTEGER;
        return aEnds - bEnds;
      });
    case "most-votes":
      return copy.sort((a, b) => b.totalVotes - a.totalVotes);
    default:
      return copy;
  }
}

export default function GovernancePage() {
  const { config, getConfig, getProposal, isLoading, error, createProposal } = useGovernance();
  const { isConnected } = useFreighter();
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | GovernanceProposalStatus>("All");
  const [actionFilter, setActionFilter] = useState<"All" | GovernanceProposalAction>("All");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await getConfig();
        const count = cfg?.proposalCount ?? 0;
        if (count <= 0) {
          setProposals([]);
          return;
        }

        const ids = Array.from({ length: count }, (_, i) => i + 1);

        // Fetch proposals in bounded parallel batches (concurrency limit = 5)
        const loaded: GovernanceProposal[] = [];
        const BATCH_SIZE = 5;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) => getProposal(id)),
          );
          for (const result of results) {
            if (result.status === "fulfilled") {
              loaded.push(result.value);
            }
          }
        }

        setProposals(loaded);
      } catch {
        setProposals([]);
      }
    };

    load();
  }, [getConfig, getProposal]);

  const filteredProposals = useMemo(() => {
    const filtered = proposals.filter((p) => {
      const statusOk = statusFilter === "All" || p.status === statusFilter;
      const actionOk = actionFilter === "All" || p.action === actionFilter;
      return statusOk && actionOk;
    });
    return sortProposals(filtered, sortKey);
  }, [proposals, statusFilter, actionFilter, sortKey]);

  const activeProposals = filteredProposals.filter((p) => p.status === "Active");
  const pastProposals = filteredProposals.filter((p) => p.status !== "Active");

  const handleCreateProposal = async (data: {
    title: string;
    description: string;
    action: GovernanceProposalAction;
    target: string;
    amount: bigint;
  }) => {
    setIsCreating(true);
    try {
      await createProposal(
        data.title,
        data.description,
        data.action,
        data.amount,
        data.target,
      );
      const cfg = await getConfig();
      const count = cfg?.proposalCount ?? 0;
      if (count > 0) {
        const proposal = await getProposal(count);
        setProposals((prev) => [proposal, ...prev]);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Governance</h1>
          <p className="text-gray-400 mt-1">
            Create and vote on proposals for your organization
          </p>
        </div>
        <button
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowCreateModal(true)}
          disabled={!isConnected}
          title={!isConnected ? "Connect your wallet to create proposals" : undefined}
        >
          + New Proposal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading && proposals.length === 0 ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <div className="card text-center">
              <p className="text-sm text-gray-400">Total Proposals</p>
              <p className="text-2xl font-bold text-white mt-1">{config?.proposalCount ?? proposals.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{proposals.filter((p) => p.status === "Active").length}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-400">Quorum %</p>
              <p className="text-2xl font-bold text-primary-400 mt-1">{config?.quorumPercent ?? 0}%</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-400">Members</p>
              <p className="text-2xl font-bold text-white mt-1">{config?.memberCount ?? 0}</p>
            </div>
          </>
        )}
      </div>

      <div className="card grid grid-cols-1 gap-4 md:grid-cols-[repeat(3,minmax(0,11rem))_minmax(0,1fr)] md:items-end">
        <div className="w-full">
          <label className="mb-1 block whitespace-nowrap text-xs text-gray-400">
            Status
          </label>
          <select
            className="w-full rounded-lg border border-stellar-border bg-gray-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="w-full">
          <label className="mb-1 block whitespace-nowrap text-xs text-gray-400">
            Action
          </label>
          <select
            className="w-full rounded-lg border border-stellar-border bg-gray-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
          >
            {ACTION_FILTERS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="w-full">
          <label className="mb-1 block whitespace-nowrap text-xs text-gray-400">
            Sort By
          </label>
          <select
            className="w-full rounded-lg border border-stellar-border bg-gray-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2">
          {(statusFilter !== "All" || actionFilter !== "All" || sortKey !== "newest") && (
            <button
              onClick={() => {
                setStatusFilter("All");
                setActionFilter("All");
                setSortKey("newest");
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Reset governance filters to defaults"
            >
              Reset filters
            </button>
          )}
        </div>
        {error ? (
          <p className="text-sm text-red-400 md:col-span-4">
            {typeof error === "string" ? error : error.message}
          </p>
        ) : null}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Active Proposals</h2>
        <div className="space-y-4">
          {isLoading && proposals.length === 0 ? (
            <>
              <ListCardSkeleton />
              <ListCardSkeleton />
              <ListCardSkeleton />
            </>
          ) : activeProposals.length === 0 ? (
            <div className="card">
              <p className="text-gray-500 text-center py-8">No active proposals for selected filters</p>
            </div>
          ) : (
            activeProposals.map((proposal) => (
              <ProposalCard key={proposal.id} {...proposal} totalMembers={config?.memberCount ?? 0} />
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Past Proposals</h2>
        <div className="space-y-4">
          {isLoading && proposals.length === 0 ? (
            <>
              <ListCardSkeleton />
              <ListCardSkeleton />
            </>
          ) : pastProposals.length === 0 ? (
            <div className="card">
              <p className="text-gray-500 text-center py-8">No past proposals for selected filters</p>
            </div>
          ) : (
            pastProposals.map((proposal) => (
              <ProposalCard key={proposal.id} {...proposal} totalMembers={config?.memberCount ?? 0} />
            ))
          )}
        </div>
      </div>

      <CreateProposalModal
        isOpen={showCreateModal}
        isCreating={isCreating}
        isWalletConnected={isConnected}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProposal}
      />
    </div>
  );
}
