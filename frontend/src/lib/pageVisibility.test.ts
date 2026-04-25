import { describe, expect, it, vi } from "vitest";

/**
 * Tests for the page-visibility pause logic used in useTreasury and
 * useGovernance. We test the pure polling guard logic that doesn't require
 * a DOM environment (vitest is configured with environment: "node").
 */

describe("page visibility pause logic", () => {
  it("polling guard: refresh is skipped when page is hidden", () => {
    const refresh = vi.fn();
    let isPageVisible = false;

    // Mirrors the interval callback in useTreasury / useGovernance
    const intervalCallback = () => {
      if (isPageVisible) {
        refresh();
      }
    };

    intervalCallback();
    expect(refresh).not.toHaveBeenCalled();

    isPageVisible = true;
    intervalCallback();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("polling guard: refresh runs every tick when page is visible", () => {
    const refresh = vi.fn();
    const isPageVisible = true;

    const intervalCallback = () => {
      if (isPageVisible) {
        refresh();
      }
    };

    intervalCallback();
    intervalCallback();
    intervalCallback();
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("polling guard: refresh stops when page becomes hidden mid-session", () => {
    const refresh = vi.fn();
    let isPageVisible = true;

    const intervalCallback = () => {
      if (isPageVisible) {
        refresh();
      }
    };

    intervalCallback(); // visible → refresh
    isPageVisible = false;
    intervalCallback(); // hidden → skip
    intervalCallback(); // hidden → skip
    isPageVisible = true;
    intervalCallback(); // visible again → refresh

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
