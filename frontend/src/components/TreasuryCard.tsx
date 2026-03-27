// TODO: [FE-11] Implement TreasuryCard with real data
// TODO: [FE-9] Add approval button functionality

import { formatAddress, formatXlm } from "@/lib/formatters";

interface TreasuryCardProps {
  /** Transaction ID */
  txId?: number;
  /** Destination address */
  to?: string;
  /** Amount in stroops */
  amount?: number;
  /** Transaction memo */
  memo?: string;
  /** Number of approvals received */
  approvals?: number;
  /** Required approval threshold */
  threshold?: number;
  /** Whether the transaction has been executed */
  executed?: boolean;
}

/**
 * Card component for displaying a treasury transaction.
 * Shows transaction details, approval progress, and action buttons.
 */
export function TreasuryCard({
  txId = 0,
  to = "G...",
  amount = 0,
  memo = "",
  approvals = 0,
  threshold = 1,
  executed = false,
}: TreasuryCardProps) {
  const statusColor = executed
    ? "text-gray-400"
    : approvals >= threshold
      ? "text-green-400"
      : "text-yellow-400";

  const statusText = executed
    ? "Executed"
    : approvals >= threshold
      ? "Ready"
      : "Pending";

  return (
    <div className="card flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-mono text-gray-500">#{txId}</span>
          <span className={`text-xs font-semibold ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <p className="text-white font-semibold mt-1">
          {formatXlm(amount)} XLM → {formatAddress(to, { startChars: 6, endChars: 4 })}
        </p>
        {memo && <p className="text-gray-400 text-sm mt-0.5">{memo}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-400">
          {approvals}/{threshold} approvals
        </p>
        {!executed && (
          <button className="btn-primary text-xs mt-2 py-1 px-3">
            Approve
          </button>
        )}
      </div>
    </div>
  );
}
