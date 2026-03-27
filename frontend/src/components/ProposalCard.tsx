// TODO: [FE-13] Implement ProposalCard with real data
// TODO: [FE-17] Implement status badge colors

import Link from "next/link";
import { formatAddress } from "@/lib/formatters";

interface ProposalCardProps {
  /** Proposal ID */
  id?: number;
  /** Proposal title */
  title?: string;
  /** Proposal description */
  description?: string;
  /** Proposal status */
  status?: "Active" | "Passed" | "Rejected" | "Executed" | "Expired";
  /** Votes in favor */
  votesFor?: number;
  /** Votes against */
  votesAgainst?: number;
  /** Total members who can vote */
  totalMembers?: number;
  /** Proposer address */
  proposer?: string;
}

/**
 * Card component for displaying a governance proposal.
 * Shows proposal details, voting progress, and link to detail page.
 */
export function ProposalCard({
  id = 0,
  title = "Untitled Proposal",
  description = "",
  status = "Active",
  votesFor = 0,
  votesAgainst = 0,
  totalMembers = 1,
  proposer = "G...",
}: ProposalCardProps) {
  const statusColors: Record<string, string> = {
    Active: "bg-green-900/50 text-green-400 border-green-700",
    Passed: "bg-blue-900/50 text-blue-400 border-blue-700",
    Rejected: "bg-red-900/50 text-red-400 border-red-700",
    Executed: "bg-purple-900/50 text-purple-400 border-purple-700",
    Expired: "bg-gray-900/50 text-gray-400 border-gray-700",
  };

  const totalVotes = votesFor + votesAgainst;
  const forPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

  return (
    <Link href={`/proposals/${id}`} className="block">
      <div className="card hover:border-primary-600/50 transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-sm font-mono text-gray-500">#{id}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[status]}`}
              >
                {status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-gray-400 text-sm mt-1">{description}</p>
            )}
            <p className="text-gray-500 text-xs mt-2">
              by {formatAddress(proposer, { startChars: 6, endChars: 4 })}
            </p>
          </div>
          <div className="text-right ml-4">
            <p className="text-sm text-gray-400">
              {totalVotes}/{totalMembers} voted
            </p>
            {totalVotes > 0 && (
              <div className="mt-2 w-24">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">{votesFor}</span>
                  <span className="text-red-400">{votesAgainst}</span>
                </div>
                <div className="w-full bg-red-900/30 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${forPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
