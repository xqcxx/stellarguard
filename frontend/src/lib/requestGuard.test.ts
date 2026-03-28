import { describe, expect, it } from "vitest";
import {
  createLatestRequestGuard,
  isAbortError,
  throwIfAborted,
} from "@/lib/requestGuard";

describe("request guard", () => {
  it("aborts superseded requests and keeps only the latest active", () => {
    const guard = createLatestRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(first.signal.aborted).toBe(true);
    expect(guard.isCurrent(first.id)).toBe(false);
    expect(second.signal.aborted).toBe(false);
    expect(guard.isCurrent(second.id)).toBe(true);
  });

  it("aborts active requests during cleanup", () => {
    const guard = createLatestRequestGuard();
    const request = guard.begin();

    guard.dispose();

    expect(request.signal.aborted).toBe(true);
    expect(guard.isCurrent(request.id)).toBe(false);
  });

  it("detects abort-like errors consistently", () => {
    expect(
      isAbortError(new DOMException("The request was aborted.", "AbortError")),
    ).toBe(true);
    expect(isAbortError(new Error("request cancelled"))).toBe(true);
    expect(isAbortError(new Error("network failure"))).toBe(false);
  });

  it("throws when an abort signal is already cancelled", () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => throwIfAborted(controller.signal)).toThrow(/aborted/i);
  });
});
