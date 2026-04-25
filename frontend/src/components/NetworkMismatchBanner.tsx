"use client";

import { useFreighter } from "@/hooks/useFreighter";
import {
  ACTIVE_NETWORK,
  getWalletNetworkLabel,
  isWalletNetworkMismatch,
} from "@/lib/network";

export function NetworkMismatchBanner() {
  const { network, isConnected } = useFreighter();
  const mismatch = isWalletNetworkMismatch(network);

  if (!isConnected || !mismatch) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-900/20">
      <div className="mx-auto max-w-7xl px-4 py-2 text-sm text-amber-200 sm:px-6 lg:px-8">
        Wallet network mismatch: Freighter is on{" "}
        <span className="font-semibold">{getWalletNetworkLabel(network)}</span>, but
        StellarGuard is configured for{" "}
        <span className="font-semibold">{ACTIVE_NETWORK.name}</span>. Switch your
        wallet network to continue.
      </div>
    </div>
  );
}
