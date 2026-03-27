import { RouteSkeleton } from "@/components/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Loading treasury"
      description="Fetching treasury balances, approvals, and transaction history."
    />
  );
}
