"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Treasury view unavailable"
      message="The treasury route failed to render. Retry after checking your wallet and contract configuration."
      onRetry={reset}
    />
  );
}
