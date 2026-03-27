import { describe, expect, it } from "vitest";
import {
  formatAbsoluteDate,
  formatAddress,
  formatRelativeDate,
  formatXlm,
} from "@/lib/formatters";

describe("formatXlm", () => {
  it("formats whole stroops into XLM", () => {
    expect(formatXlm(10_000_000)).toBe("1.00");
  });

  it("preserves up to seven decimal places", () => {
    expect(formatXlm(12_345_678)).toBe("1.2345678");
  });

  it("supports negative values", () => {
    expect(formatXlm(-25_000_000)).toBe("-2.50");
  });

  it("throws on non-integer input", () => {
    expect(() => formatXlm(1.25)).toThrow("Stroops value must be a finite integer.");
  });
});

describe("formatAddress", () => {
  it("truncates long addresses consistently", () => {
    expect(formatAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456789")).toBe("GABC...6789");
  });

  it("returns short addresses unchanged", () => {
    expect(formatAddress("GSHORT123")).toBe("GSHORT123");
  });
});

describe("date formatting", () => {
  it("formats absolute dates", () => {
    expect(formatAbsoluteDate("2026-03-27T10:30:00Z", "en-US")).toMatch(/Mar/);
  });

  it("formats relative future dates", () => {
    const now = new Date("2026-03-27T10:00:00Z");
    expect(formatRelativeDate("2026-03-27T12:00:00Z", now, "en-US")).toBe("in 2 hours");
  });

  it("formats relative past dates", () => {
    const now = new Date("2026-03-27T10:00:00Z");
    expect(formatRelativeDate("2026-03-26T10:00:00Z", now, "en-US")).toBe("yesterday");
  });

  it("throws on invalid dates", () => {
    expect(() => formatAbsoluteDate("not-a-date")).toThrow("Invalid date value.");
  });
});
