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
      title="Dashboard unavailable"
      message="The dashboard hit a runtime error while loading. Retry to request the route again."
      onRetry={reset}
    />
  );
}
