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
      title="Proposal unavailable"
      message="This proposal route failed to load. Retry to request the proposal details again."
      onRetry={reset}
    />
  );
}
