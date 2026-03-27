"use client";

interface RouteErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
}

export function RouteErrorState({
  title,
  message,
  onRetry,
}: RouteErrorStateProps) {
  return (
    <div className="card mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
        Route Error
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-sm text-gray-400">{message}</p>
      <button className="btn-primary mt-6" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
