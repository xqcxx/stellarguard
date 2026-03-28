export interface GuardedRequest {
  id: number;
  signal: AbortSignal;
}

export interface LatestRequestGuard {
  begin(): GuardedRequest;
  isCurrent(id: number): boolean;
  cancel(reason?: string): void;
  dispose(): void;
}

const DEFAULT_ABORT_REASON = "Request superseded by a newer call.";

export function createLatestRequestGuard(): LatestRequestGuard {
  let currentId = 0;
  let currentController: AbortController | null = null;
  let disposed = false;

  return {
    begin() {
      currentController?.abort(DEFAULT_ABORT_REASON);
      currentId += 1;
      currentController = new AbortController();

      return {
        id: currentId,
        signal: currentController.signal,
      };
    },

    isCurrent(id: number) {
      return (
        !disposed &&
        id === currentId &&
        currentController !== null &&
        !currentController.signal.aborted
      );
    },

    cancel(reason = "Request cancelled.") {
      currentController?.abort(reason);
    },

    dispose() {
      disposed = true;
      currentController?.abort("Request cancelled during cleanup.");
      currentController = null;
    },
  };
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("abort") || message.includes("cancel");
  }

  return false;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("The request was aborted.", "AbortError");
  }
}
