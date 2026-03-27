import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold gradient-text mb-4">
          StellarGuard
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Decentralized multi-signature treasury and DAO governance.
          Manage shared funds with configurable approval thresholds on Stellar.
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
      {/* TODO: [FE-11] Implement real balance display with Soroban data */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wide">
            Treasury Balance
          </p>
          <p className="text-3xl font-bold text-white mt-2">— XLM</p>
          <p className="text-xs text-gray-500 mt-1">Connect wallet to view</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wide">
            Active Proposals
          </p>
          <p className="text-3xl font-bold text-white mt-2">—</p>
          <p className="text-xs text-gray-500 mt-1">Connect wallet to view</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wide">
            Total Signers
          </p>
          <p className="text-3xl font-bold text-white mt-2">—</p>
          <p className="text-xs text-gray-500 mt-1">Connect wallet to view</p>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-2">
            🔐 Multi-Sig Treasury
          </h3>
          <p className="text-gray-400 text-sm">
            Configure approval thresholds. Require multiple signers to approve
            withdrawals. Full on-chain transparency.
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-2">
            🗳️ DAO Governance
          </h3>
          <p className="text-gray-400 text-sm">
            Create proposals, vote on fund allocation, and execute decisions
            with quorum-based finalization.
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-2">
            🔒 Token Vesting
          </h3>
          <p className="text-gray-400 text-sm">
            Lock tokens with time-based release. Set cliff periods and vesting
            schedules for team allocations.
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-2">
            👥 Role-Based Access
          </h3>
          <p className="text-gray-400 text-sm">
            Owner, Admin, Member, and Viewer tiers. Granular permissions for
            every action in the platform.
          </p>
        </div>
      </section>
    </div>
  );
}
