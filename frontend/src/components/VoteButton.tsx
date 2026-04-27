import React from "react";
import { toast } from "react-hot-toast";
import { useFreighter } from "@/hooks/useFreighter";
import { useGovernance } from "@/hooks/useGovernance";

interface VoteButtonProps {
  proposalId: number;
  voteFor: boolean;
  hasVoted: boolean;
  votingClosed: boolean;
  isPending?: boolean;
  onVoteSuccess?: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  proposalId,
  voteFor,
  hasVoted,
  votingClosed,
  isPending = false,
  onVoteSuccess,
}) => {
  const { isConnected } = useFreighter();
  const { vote, pendingVotes } = useGovernance();

  // Use per-proposal pending state from the map rather than the global isLoading
  // flag so that voting on one proposal doesn't disable buttons on others.
  const isThisVotePending = isPending || pendingVotes.has(proposalId);

  const isDisabled =
    hasVoted || votingClosed || !isConnected || isThisVotePending;

  const handleVote = async () => {
    if (isDisabled) {
      return;
    }

    try {
      await vote(proposalId, voteFor);
      toast.success(
        `Vote submitted ${voteFor ? "for" : "against"} proposal #${proposalId}`,
      );
      await onVoteSuccess?.();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cast vote",
      );
      console.error(error);
    }
  };

  const disabledReason = hasVoted
    ? "You have already voted on this proposal"
    : votingClosed
      ? "Voting is closed"
      : !isConnected
        ? "Connect your wallet to vote"
        : isThisVotePending
          ? "Waiting for vote confirmation"
          : "";

  const baseLabel = voteFor ? "Vote For" : "Vote Against";
  const ariaLabel = disabledReason
    ? `${baseLabel}: ${disabledReason}`
    : baseLabel;
  const descId = `vote-desc-${proposalId}-${voteFor ? "for" : "against"}`;

  return (
    <>
      {isDisabled && disabledReason && (
        <span id={descId} className="sr-only">
          {disabledReason}
        </span>
      )}
      <button
        aria-label={ariaLabel}
        aria-describedby={isDisabled && disabledReason ? descId : undefined}
        className={`${voteFor ? "btn-primary" : "btn-secondary"} focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`}
        disabled={isDisabled}
        onClick={handleVote}
        type="button"
      >
        {isThisVotePending
          ? "Submitting..."
          : voteFor
            ? "Vote For"
            : "Vote Against"}
      </button>
    </>
  );
};
