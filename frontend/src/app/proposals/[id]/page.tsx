import Link from "next/link";

export default function ProposalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/governance"
        className="text-primary-400 hover:text-primary-300 text-sm"
      >
        ← Back to Governance
      </Link>

      {/* Proposal Header */}
      {/* TODO: [FE-15] Fetch real proposal data from Soroban */}
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">
                Proposal #{params.id}
              </h1>
              {/* TODO: [FE-17] Implement status badge */}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/50 text-green-400 border border-green-700">
                Active
              </span>
            </div>
            <p className="text-gray-400 mt-2">Loading proposal details...</p>
          </div>
        </div>
      </div>

      {/* Voting Progress */}
      {/* TODO: [FE-18] Implement voting progress bar */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          Voting Progress
        </h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-400">For</span>
              <span className="text-gray-400">0 votes</span>
            </div>
            <div className="w-full bg-stellar-border rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "0%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-400">Against</span>
              <span className="text-gray-400">0 votes</span>
            </div>
            <div className="w-full bg-stellar-border rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: "0%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Vote Actions */}
      {/* TODO: [FE-16] Wire up vote casting with Soroban contract */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Cast Vote</h2>
        <div className="flex space-x-4">
          <button className="btn-primary flex-1 py-3">
            ✅ Vote For
          </button>
          <button className="btn-secondary flex-1 py-3 border-red-700 hover:bg-red-900/30">
            ❌ Vote Against
          </button>
        </div>
      </div>
    </div>
  );
}
