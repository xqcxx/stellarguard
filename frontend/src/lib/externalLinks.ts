const REQUIRED_REL_TOKENS = ["noopener", "noreferrer"] as const;

function tokenizeRel(rel?: string): string[] {
  if (!rel) return [];
  return rel
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function buildSecureRel(rel?: string): string {
  const tokens = new Set(tokenizeRel(rel));
  for (const token of REQUIRED_REL_TOKENS) {
    tokens.add(token);
  }
  return Array.from(tokens).join(" ");
}

export function requiresSecureRel(target?: string): boolean {
  return target === "_blank";
}
