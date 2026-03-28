/**
 * Analytics abstraction with pluggable provider.
 *
 * Telemetry can be toggled off by setting NEXT_PUBLIC_ANALYTICS_ENABLED=false
 * in the environment. All payloads are privacy-safe: no PII is collected,
 * wallet addresses are truncated to first/last 4 characters.
 */

import { readPublicEnv } from "./env";

// ---------------------------------------------------------------------------
// Event schema
// ---------------------------------------------------------------------------

/**
 * Core product events tracked by StellarGuard.
 *
 * | Event                 | Payload                           |
 * |-----------------------|-----------------------------------|
 * | wallet_connect        | { chain, truncatedAddress }       |
 * | wallet_disconnect     | {}                                |
 * | tx_submit             | { type, chain }                   |
 * | tx_success            | { type, chain, durationMs }       |
 * | tx_failure            | { type, chain, errorCode }        |
 * | page_view             | { path }                          |
 * | proposal_vote         | { proposalId, vote }              |
 * | treasury_deposit      | { chain }                         |
 */
export type AnalyticsEvent =
  | { name: "wallet_connect"; properties: { chain: string; truncatedAddress: string } }
  | { name: "wallet_disconnect"; properties: Record<string, never> }
  | { name: "tx_submit"; properties: { type: string; chain: string } }
  | { name: "tx_success"; properties: { type: string; chain: string; durationMs: number } }
  | { name: "tx_failure"; properties: { type: string; chain: string; errorCode: string } }
  | { name: "page_view"; properties: { path: string } }
  | { name: "proposal_vote"; properties: { proposalId: string; vote: string } }
  | { name: "treasury_deposit"; properties: { chain: string } };

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
}

// ---------------------------------------------------------------------------
// Console provider (development)
// ---------------------------------------------------------------------------

const consoleProvider: AnalyticsProvider = {
  track(event) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event.name, event.properties);
    }
  },
};

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let activeProvider: AnalyticsProvider = consoleProvider;

export function setAnalyticsProvider(provider: AnalyticsProvider): void {
  activeProvider = provider;
}

function isEnabled(): boolean {
  const flag = readPublicEnv("NEXT_PUBLIC_ANALYTICS_ENABLED");
  return flag !== "false";
}

export function trackEvent(event: AnalyticsEvent): void {
  if (!isEnabled()) return;
  activeProvider.track(event);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function truncateAddress(address: string): string {
  if (address.length <= 11) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
