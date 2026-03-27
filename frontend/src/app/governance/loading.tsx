import { RouteSkeleton } from "@/components/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Loading governance"
      description="Fetching proposal stats, active votes, and governance history."
    />
  );
}
