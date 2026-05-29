"use client";

import Link from "next/link";
import { useFreighter } from "@/hooks/useFreighter";
import { useTreasury } from "@/hooks/useTreasury";
import { useGovernance } from "@/hooks/useGovernance";
import { formatXlm } from "@/lib/formatters";
import { MetricCardSkeleton } from "@/components/Skeletons";
import { LockKeyhole, ShieldCheck, UsersRound, Vote } from "lucide-react";

const features = [
  {
    title: "Multi-Sig Treasury",
    description:
      "Configure approval thresholds. Require multiple signers to approve withdrawals. Full on-chain transparency.",
    Icon: ShieldCheck,
  },
  {
    title: "DAO Governance",
    description:
      "Create proposals, vote on fund allocation, and execute decisions with quorum-based finalization.",
    Icon: Vote,
  },
  {
    title: "Token Vesting",
    description:
      "Lock tokens with time-based release. Set cliff periods and vesting schedules for team allocations.",
    Icon: LockKeyhole,
  },
  {
    title: "Role-Based Access",
    description:
      "Owner, Admin, Member, and Viewer tiers. Granular permissions for every action in the platform.",
    Icon: UsersRound,
  },
];

export default function Home() {
  const { address } = useFreighter();
  const {
    balance,
    config: treasuryConfig,
    isLoading: treasuryLoading,
  } = useTreasury();
  const { config: govConfig, isLoading: govLoading } = useGovernance();

  const isConnected = !!address;
  const isLoading = treasuryLoading || govLoading;

  // Calculate active proposals (proposals that are in Active status)
  const activeProposals = govConfig?.proposal_count ?? 0;
  const totalSigners = treasuryConfig?.signer_count ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold gradient-text mb-4">StellarGuard</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Decentralized multi-signature treasury and DAO governance. Manage
          shared funds with configurable approval thresholds on Stellar.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/treasury" className="btn-primary text-lg px-8 py-3">
            Open Treasury
          </Link>
          <Link href="/governance" className="btn-secondary text-lg px-8 py-3">
            View Proposals
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <div className="card text-center">
              <p className="text-sm text-gray-400 uppercase tracking-wide">
                Treasury Balance
              </p>
              {isConnected ? (
                <p className="text-3xl font-bold text-white mt-2">
                  {formatXlm(balance)}
                </p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-white mt-2">— XLM</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect wallet to view
                  </p>
                </>
              )}
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-400 uppercase tracking-wide">
                Active Proposals
              </p>
              {isConnected ? (
                <p className="text-3xl font-bold text-white mt-2">
                  {activeProposals}
                </p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-white mt-2">—</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect wallet to view
                  </p>
                </>
              )}
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-400 uppercase tracking-wide">
                Total Signers
              </p>
              {isConnected ? (
                <p className="text-3xl font-bold text-white mt-2">
                  {totalSigners}
                </p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-white mt-2">—</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect wallet to view
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* Empty State for When No Data is Available */}
      {!isConnected && (
        <section className="card border border-stellar-border/50 bg-gradient-to-br from-gray-900/50 to-gray-800/50 text-center py-12">
          <p className="text-gray-400 text-sm">
            No treasury or proposal data available. Connect your wallet and
            navigate to Treasury or Governance to get started.
          </p>
        </section>
      )}

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {features.map(({ title, description, Icon }) => (
          <div className="card" key={title}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stellar-border/50 bg-stellar-primary/10 text-stellar-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {title}
                </h3>
                <p className="text-gray-400 text-sm">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
