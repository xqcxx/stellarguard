import React from "react";
import { formatAddress, formatXlm } from "@/lib/formatters";

interface TreasuryCardProps {
  txId: number;
  to: string;
  amount: bigint;
  memo: string;
  approvals: string[];
  threshold: number;
  executed: boolean;
  isPendingApproval?: boolean;
  isPendingExecution?: boolean;
  onApprove?: (txId: number) => void;
  onExecute?: (txId: number) => void;
  currentAddress: string | null;
  canSign: boolean;
}

export const TreasuryCard: React.FC<TreasuryCardProps> = ({
  txId,
  to,
  amount,
  memo,
  approvals,
  threshold,
  executed,
  isPendingApproval,
  isPendingExecution,
  onApprove,
  onExecute,
  currentAddress,
  canSign,
}) => {
  const isReadyToExecute = approvals.length >= threshold;
  const hasApproved =
    currentAddress &&
    approvals.some(
      (addr) => addr.toLowerCase() === currentAddress.toLowerCase(),
    );

  const approveDescId = `approve-desc-${txId}`;
  const executeDescId = `execute-desc-${txId}`;

  const approveDisabledReason = hasApproved
    ? "You have already approved this transaction."
    : !canSign
      ? "You do not have signing permission for this treasury."
      : isPendingApproval
        ? "Approval is being confirmed on chain."
        : undefined;

  const executeDisabledReason = !canSign
    ? "You do not have signing permission for this treasury."
    : isPendingExecution
      ? "Execution is being confirmed on chain."
      : undefined;

  return (
    <div className="card p-5 group hover:border-primary-500/50 transition-colors">
      {/* Live region announces pending action state changes to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isPendingApproval && "Approval transaction pending confirmation."}
        {isPendingExecution && "Execution transaction pending confirmation."}
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-white">Transaction #{txId}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Created on-chain</p>
        </div>
        <div>
          {executed ? (
            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 border border-green-500/20">
              Executed
            </span>
          ) : isReadyToExecute ? (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500 border border-blue-500/20">
              Ready to Execute
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/20">
              Pending Approvals
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Recipient</span>
          <span className="text-gray-200 font-mono">{formatAddress(to)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Amount</span>
          <span className="text-white font-bold">{formatXlm(amount)} XLM</span>
        </div>
        {memo && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Memo</span>
            <span className="text-gray-300 italic">{memo}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-stellar-border flex items-center justify-between">
        {/* role="status" + aria-live announces approval count changes to screen readers */}
        <div
          role="status"
          aria-live="polite"
          aria-label={`${approvals.length} of ${threshold} approvals required${isReadyToExecute ? ", threshold met" : ""}`}
          className="flex flex-col gap-1"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            Approvals
          </span>
          <div className="flex items-center gap-1.5">
            <div
              aria-hidden="true"
              className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-500 ${isReadyToExecute ? "bg-green-500" : "bg-primary-500"
                  }`}
                style={{
                  width: `${Math.min(100, (approvals.length / threshold) * 100)}%`,
                }}
              />
            </div>
            <span aria-hidden="true" className="text-xs font-medium text-gray-300">
              {approvals.length} / {threshold}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {!executed && (
            <>
              {isReadyToExecute ? (
                <>
                  {executeDisabledReason && (
                    <span id={executeDescId} className="sr-only">
                      {executeDisabledReason}
                    </span>
                  )}
                  <button
                    aria-label={`Execute transaction #${txId}`}
                    aria-describedby={executeDisabledReason ? executeDescId : undefined}
                    className="btn-primary py-1.5 px-4 text-xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecute?.(txId);
                    }}
                    disabled={!canSign || isPendingExecution}
                  >
                    {isPendingExecution ? "Executing..." : "Execute"}
                  </button>
                </>
              ) : (
                <>
                  {approveDisabledReason && (
                    <span id={approveDescId} className="sr-only">
                      {approveDisabledReason}
                    </span>
                  )}
                  <button
                    aria-label={
                      hasApproved
                        ? `Already approved transaction #${txId}`
                        : `Approve transaction #${txId}`
                    }
                    aria-describedby={approveDisabledReason ? approveDescId : undefined}
                    className={`py-1.5 px-4 text-xs rounded-lg font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${hasApproved || !canSign
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasApproved && canSign) onApprove?.(txId);
                    }}
                    disabled={hasApproved || !canSign || isPendingApproval}
                  >
                    {isPendingApproval
                      ? "Approving..."
                      : hasApproved
                        ? "Approved"
                        : "Approve"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};