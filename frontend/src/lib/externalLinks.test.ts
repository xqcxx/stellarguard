import { describe, expect, it } from "vitest";
import { buildSecureRel, requiresSecureRel } from "./externalLinks";

describe("externalLinks", () => {
  it("adds noopener and noreferrer when rel is missing", () => {
    expect(buildSecureRel()).toBe("noopener noreferrer");
  });

  it("preserves existing rel tokens and appends required tokens", () => {
    expect(buildSecureRel("nofollow")).toBe("nofollow noopener noreferrer");
  });

  it("deduplicates tokens case-insensitively", () => {
    expect(buildSecureRel("NoOpener noreferrer")).toBe("noopener noreferrer");
  });

  it("requires secure rel when target is _blank", () => {
    expect(requiresSecureRel("_blank")).toBe(true);
    expect(requiresSecureRel("_self")).toBe(false);
  });
});
