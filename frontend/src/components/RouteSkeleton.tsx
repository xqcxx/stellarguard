interface RouteSkeletonProps {
  title: string;
  description: string;
}

export function RouteSkeleton({ title, description }: RouteSkeletonProps) {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-10 w-64 rounded-xl bg-white/10" />
        <div className="h-5 w-full max-w-xl rounded-lg bg-white/5" />
        <div className="h-5 w-3/4 max-w-lg rounded-lg bg-white/5" />
      </div>

      <div className="card space-y-4">
        <div className="h-6 w-40 rounded-lg bg-white/10" />
        <div className="h-4 w-full rounded-lg bg-white/5" />
        <div className="h-4 w-5/6 rounded-lg bg-white/5" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card space-y-4">
          <div className="h-5 w-32 rounded-lg bg-white/10" />
          <div className="h-20 rounded-2xl bg-white/5" />
        </div>
        <div className="card space-y-4">
          <div className="h-5 w-32 rounded-lg bg-white/10" />
          <div className="h-20 rounded-2xl bg-white/5" />
        </div>
      </div>

      <div className="sr-only">{title}: {description}</div>
    </div>
  );
}
