import Link from "next/link";
import { formatAddress, formatRelativeDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";
import { ACTION_LABELS } from "@/lib/contractData";
import type { GovernanceProposalAction, GovernanceProposalStatus } from "@/lib/contractData";

interface ProposalCardProps {
  id?: number;
  title?: string;
  description?: string;
  status?: GovernanceProposalStatus;
  action?: GovernanceProposalAction;
  votesFor?: number;
  votesAgainst?: number;
  totalMembers?: number;
  proposer?: string;
  endsAt?: number;
  createdAt?: number;
}

export function ProposalCard({
  id = 0,
  title = "Untitled Proposal",
  description = "",
  status = "Active",
  action,
  votesFor = 0,
  votesAgainst = 0,
  totalMembers = 1,
  proposer = "G...",
  endsAt,
  createdAt,
}: ProposalCardProps) {
  const totalVotes = votesFor + votesAgainst;
  const forPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

  const now = Math.floor(Date.now() / 1000);
  const timeLabel =
    status === "Active" && endsAt != null
      ? endsAt > now
        ? "Ends " + formatRelativeDate(endsAt * 1000)
        : "Voting ended"
      : createdAt != null
        ? "Created " + formatRelativeDate(createdAt * 1000)
        : null;

  return (
    <Link
      href={"/proposals/" + id}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-stellar-blue focus-visible:ring-offset-2 focus-visible:ring-offset-stellar-darker"
    >
      <div className="card hover:border-primary-600/50 transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-mono text-gray-500">#{id}</span>
              <StatusBadge status={status} />
              {action && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-gray-300">
                  {ACTION_LABELS[action]}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
            {description && (
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>by {formatAddress(proposer, { startChars: 6, endChars: 4 })}</span>
              {timeLabel && <span>· {timeLabel}</span>}
            </div>
          </div>
          <div className="text-right ml-4 shrink-0">
            <p className="text-sm text-gray-400">
              {totalVotes}/{totalMembers} voted
            </p>
            {totalVotes > 0 && (
              <div className="mt-2 w-28">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">{votesFor} for</span>
                  <span className="text-red-400">{votesAgainst} against</span>
                </div>
                <div className="w-full bg-red-900/30 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: forPercent + "%" }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {Math.round(forPercent)}% for
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
