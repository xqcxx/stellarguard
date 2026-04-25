"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the page is visible (document.visibilityState === "visible").
 * Useful for pausing polling loops while the tab is hidden to avoid unnecessary
 * network traffic and stale-update races.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  useEffect(() => {
    const handleChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleChange);
    return () => {
      document.removeEventListener("visibilitychange", handleChange);
    };
  }, []);

  return isVisible;
}
