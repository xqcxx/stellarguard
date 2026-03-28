"use client";

import { useCallback } from "react";
import { trackEvent, truncateAddress, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Hook that exposes typed telemetry helpers for critical user actions.
 *
 * Usage:
 *   const { trackWalletConnect, trackTxSubmit } = useAnalytics();
 *   trackWalletConnect("stellar", publicKey);
 */
export function useAnalytics() {
  const track = useCallback((event: AnalyticsEvent) => {
    trackEvent(event);
  }, []);

  const trackWalletConnect = useCallback(
    (chain: string, address: string) => {
      track({
        name: "wallet_connect",
        properties: { chain, truncatedAddress: truncateAddress(address) },
      });
    },
    [track],
  );

  const trackWalletDisconnect = useCallback(() => {
    track({ name: "wallet_disconnect", properties: {} });
  }, [track]);

  const trackTxSubmit = useCallback(
    (type: string, chain: string) => {
      track({ name: "tx_submit", properties: { type, chain } });
    },
    [track],
  );

  const trackTxSuccess = useCallback(
    (type: string, chain: string, durationMs: number) => {
      track({ name: "tx_success", properties: { type, chain, durationMs } });
    },
    [track],
  );

  const trackTxFailure = useCallback(
    (type: string, chain: string, errorCode: string) => {
      track({ name: "tx_failure", properties: { type, chain, errorCode } });
    },
    [track],
  );

  const trackPageView = useCallback(
    (path: string) => {
      track({ name: "page_view", properties: { path } });
    },
    [track],
  );

  return {
    track,
    trackWalletConnect,
    trackWalletDisconnect,
    trackTxSubmit,
    trackTxSuccess,
    trackTxFailure,
    trackPageView,
  };
}
