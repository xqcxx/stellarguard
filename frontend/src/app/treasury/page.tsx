"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTreasury } from "@/hooks/useTreasury";
import { useFreighter } from "@/hooks/useFreighter";
import { formatAbsoluteDate, formatAddress, formatXlm } from "@/lib/formatters";
import { ERROR_CODE_LABELS } from "@/lib/errors";
import { WalletConnect } from "@/components/WalletConnect";
import { CopyButton } from "@/components/CopyButton";
import type { TreasuryTransaction } from "@/lib/contractData";

const TreasuryCard = dynamic(() =>
  import("@/components/TreasuryCard").then((module) => module.TreasuryCard),
);
const WithdrawalModal = dynamic(() =>
  import("@/components/WithdrawalModal").then((module) => module.WithdrawalModal),
);
const ConfirmationDialog = dynamic(() =>
  import("@/components/ConfirmationDialog").then(
    (module) => module.ConfirmationDialog,
  ),
);

export default function TreasuryPage() {
  const { address } = useFreighter();
  const {
    balance,
    config,
    transactions,
    isLoading,
    error,
    isNetworkMismatch,
    pendingActions,
    isProposing,
    proposeWithdrawal,
    approve,
    execute,
    refresh,
    clearError,
  } = useTreasury();

  const [selectedTx, setSelectedTx] = useState<TreasuryTransaction | null>(null);
  const [confirmExecuteTxId, setConfirmExecuteTxId] = useState<number | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "ready" | "executed">(
    "pending",
  );
  const threshold = config?.threshold ?? 0;
  const signerCount = config?.signerCount ?? 0;

  const pendingTxs = useMemo(
    () => transactions.filter((transaction) => !transaction.executed),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((transaction) => {
      let statusMatches = false;
      if (statusFilter === "executed") {
        statusMatches = transaction.executed;
      } else if (statusFilter === "ready") {
        statusMatches = !transaction.executed && transaction.approvals.length >= threshold;
      } else if (statusFilter === "pending") {
        statusMatches = !transaction.executed && transaction.approvals.length < threshold;
      }
      if (!statusMatches) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        transaction.id.toString().includes(q) ||
        transaction.to.toLowerCase().includes(q) ||
        transaction.approvals.some((approver) =>
          approver.toLowerCase().includes(q),
        )
      );
    });
  }, [transactions, searchQuery, statusFilter, threshold]);

  const filteredHistoryTxs = useMemo(
    () => filteredTransactions.filter((transaction) => transaction.executed),
    [filteredTransactions],
  );

  const handleApprove = async (txId: number) => {
    await approve(txId);
  };

  const handleExecute = (txId: number) => {
    setConfirmExecuteTxId(txId);
  };

  const handleProposeWithdrawal = async (
    to: string,
    amount: bigint,
    memo: string,
  ) => {
    await proposeWithdrawal(to, amount, memo);
  };

  const runExecute = async () => {
    if (confirmExecuteTxId === null) {
      return;
    }

    await execute(confirmExecuteTxId);
    setConfirmExecuteTxId(null);
  };

  const exportHistoryCsv = () => {
    const rows = [
      ["id", "destination", "amount_xlm", "status", "approvals", "created_at_unix"],
      ...filteredHistoryTxs.map((transaction) => [
        String(transaction.id),
        transaction.to,
        formatXlm(transaction.amount),
        "Executed",
        transaction.approvals.join("|"),
        String(transaction.createdAt),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${cell.replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `treasury-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Treasury</h1>
          <p className="text-gray-400 mt-1">
            Live treasury status and approvals from Soroban contracts.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="btn-primary text-sm"
            onClick={() => setShowWithdrawalModal(true)}
            disabled={isNetworkMismatch || !address || isProposing}
          >
            {isProposing ? "Proposing..." : "+ Propose Withdrawal"}
          </button>
          <button
            className="btn-secondary text-sm"
            onClick={exportHistoryCsv}
            disabled={filteredHistoryTxs.length === 0}
          >
            Export CSV
          </button>
          <button className="btn-secondary text-sm" onClick={() => refresh()}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-stellar-border bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            placeholder="Search by tx ID, address, or status"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "pending" | "ready" | "executed",
              )
            }
            className="w-full rounded-lg border border-stellar-border bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
          >
            <option value="pending">Pending Approval</option>
            <option value="ready">Ready to Execute</option>
            <option value="executed">Executed</option>
          </select>
          <div className="text-xs text-gray-400 flex items-center md:justify-end">
            {filteredTransactions.length} matching transaction
            {filteredTransactions.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {isNetworkMismatch && (
        <div className="card border-red-500/40 bg-red-950/20">
          <h2 className="text-sm font-semibold text-red-300">Network mismatch</h2>
          <p className="text-sm text-red-200 mt-1">
            Your wallet is on a different network than the configured contracts.
            Switch networks in Freighter, then retry.
          </p>
        </div>
      )}

      {!address && (
        <div className="card border-yellow-500/40 bg-yellow-950/20">
          <h2 className="text-sm font-semibold text-yellow-300">Wallet disconnected</h2>
          <p className="text-sm text-yellow-200 mt-1">
            Connect your wallet to approve or execute treasury transactions.
          </p>
          <div className="mt-4 inline-flex">
            <WalletConnect />
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-500/40 bg-red-950/20">
          <h2 className="text-sm font-semibold text-red-300">
            {ERROR_CODE_LABELS[error.code]}
          </h2>
          <p className="text-sm text-red-200 mt-1">{error.message}</p>
          <div className="mt-4 flex gap-2">
            {error.recoverable && (
              <button className="btn-primary text-sm" onClick={() => refresh()}>
                Retry
              </button>
            )}
            <button className="btn-secondary text-sm" onClick={clearError}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-400">Treasury Balance</p>
            <p className="text-3xl font-bold text-white mt-1">
              {isLoading && balance === BigInt(0) ? "Loading..." : `${formatXlm(balance)} XLM`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Approval Threshold</p>
            <p className="text-2xl font-semibold text-primary-400 mt-1">
              {threshold > 0 ? `${threshold} of ${signerCount}` : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Admin</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-200 font-mono">
                {config?.admin ? formatAddress(config.admin, { startChars: 6, endChars: 4 }) : "-"}
              </p>
              {config?.admin && (
                <CopyButton value={config.admin} label="treasury admin address" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Pending Transactions</h2>
        <div className="space-y-4">
          {pendingTxs.filter((transaction) => filteredTransactions.some((item) => item.id === transaction.id)).length === 0 ? (
            <div className="card">
              <p className="text-gray-500 text-center py-8">
                {isLoading ? "Loading transactions..." : "No pending transactions."}
              </p>
            </div>
          ) : (
            pendingTxs
              .filter((transaction) =>
                filteredTransactions.some((item) => item.id === transaction.id),
              )
              .map((transaction) => (
                <div
                  key={transaction.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedTx(transaction)}
                >
                  <TreasuryCard
                    txId={transaction.id}
                    to={transaction.to}
                    amount={transaction.amount}
                    memo={transaction.memo}
                    approvals={transaction.approvals}
                    threshold={threshold || 1}
                    executed={transaction.executed}
                    isPendingApproval={
                      pendingActions.get(transaction.id) === "approve"
                    }
                    isPendingExecution={
                      pendingActions.get(transaction.id) === "execute"
                    }
                    onApprove={
                      isNetworkMismatch || !address ? undefined : handleApprove
                    }
                    onExecute={
                      isNetworkMismatch || !address ? undefined : handleExecute
                    }
                    currentAddress={address}
                    canSign={!isNetworkMismatch && !!address}
                  />
                </div>
              ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Execution History</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-stellar-border">
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">Destination</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryTxs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-8">
                    {isLoading ? "Loading execution history..." : "No executed transactions for the current filters."}
                  </td>
                </tr>
              ) : (
                filteredHistoryTxs.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-stellar-border/50 hover:bg-gray-800/50 cursor-pointer transition"
                    onClick={() => setSelectedTx(transaction)}
                  >
                    <td className="py-3 px-4 text-white">
                      <div className="flex items-center gap-2">
                        <span>#{transaction.id}</span>
                        <CopyButton
                          value={String(transaction.id)}
                          label={`transaction ${transaction.id} id`}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono">
                      {formatAddress(transaction.to, { startChars: 6, endChars: 4 })}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{formatXlm(transaction.amount)} XLM</td>
                    <td className="py-3 px-4 text-gray-400">{formatAbsoluteDate(transaction.createdAt * 1000)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTx && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setSelectedTx(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-stellar-border z-50 p-6 shadow-2xl overflow-y-auto transform transition-transform">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Transaction Details</h2>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-gray-400 hover:text-white"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-200">#{selectedTx.id}</p>
                  <CopyButton
                    value={String(selectedTx.id)}
                    label={`transaction ${selectedTx.id} id`}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Destination</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-gray-200 font-mono break-all">{selectedTx.to}</p>
                  <CopyButton
                    value={selectedTx.to}
                    label={`transaction ${selectedTx.id} destination address`}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Amount</p>
                <p className="text-sm text-gray-200 mt-1">{formatXlm(selectedTx.amount)} XLM</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Memo</p>
                <p className="text-sm text-gray-200 mt-1">{selectedTx.memo || "-"}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Approvals</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTx.approvals.length === 0 ? (
                    <span className="text-xs text-gray-500">No approvals yet</span>
                  ) : (
                    selectedTx.approvals.map((approver) => (
                      <span
                        key={`${selectedTx.id}-${approver}`}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300"
                      >
                        {formatAddress(approver, { startChars: 4, endChars: 4 })}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <p className="text-sm text-gray-200 mt-1">
                    {selectedTx.executed ? "Executed" : "Pending"}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase">Created</p>
                  <p className="text-sm text-gray-200 mt-1">
                    {formatAbsoluteDate(selectedTx.createdAt * 1000)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-stellar-border">
              <button className="w-full btn-secondary py-3" onClick={() => setSelectedTx(null)}>
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onPropose={handleProposeWithdrawal}
        balance={balance}
        isProposing={isProposing}
      />

      <ConfirmationDialog
        isOpen={confirmExecuteTxId !== null}
        title="Confirm Execution"
        description="This action executes the treasury transaction on-chain and cannot be undone."
        confirmLabel="Execute Transaction"
        cancelLabel="Cancel"
        isConfirming={
          confirmExecuteTxId !== null &&
          pendingActions.get(confirmExecuteTxId) === "execute"
        }
        onConfirm={runExecute}
        onCancel={() => setConfirmExecuteTxId(null)}
      />
    </div>
  );
}
