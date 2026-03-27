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
      title="Governance view unavailable"
      message="The governance route hit a runtime error. Retry to reload proposal data."
      onRetry={reset}
    />
  );
}
