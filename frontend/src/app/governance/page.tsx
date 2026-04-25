"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useGovernance } from "@/hooks/useGovernance";
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
        const loaded: GovernanceProposal[] = [];
        for (const id of ids) {
          try {
            const proposal = await getProposal(id);
            loaded.push(proposal);
          } catch {
            // Ignore sparse/unavailable ids from contract history.
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
        Number(data.amount),
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
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + New Proposal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      <div className="card flex flex-col md:flex-row gap-4 md:items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select
            className="bg-gray-900 border border-stellar-border rounded px-3 py-2 text-sm text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Action</label>
          <select
            className="bg-gray-900 border border-stellar-border rounded px-3 py-2 text-sm text-white"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
          >
            {ACTION_FILTERS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sort By</label>
          <select
            className="bg-gray-900 border border-stellar-border rounded px-3 py-2 text-sm text-white"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {error ? <p className="text-red-400 text-sm">{typeof error === "string" ? error : error.message}</p> : null}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Active Proposals</h2>
        <div className="space-y-4">
          {isLoading ? (
            <div className="card">
              <p className="text-gray-500 text-center py-8">Loading proposals...</p>
            </div>
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
          {pastProposals.length === 0 ? (
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
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProposal}
      />
    </div>
  );
}
