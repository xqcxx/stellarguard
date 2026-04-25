/**
 * Network configuration for StellarGuard.
 */

import { SorobanRpc } from "@stellar/stellar-sdk";

// ============================================================================
// Network Constants
// ============================================================================

export const NETWORKS = {
  testnet: {
    name: "Testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  futurenet: {
    name: "Futurenet",
    networkPassphrase: "Test SDF Future Network ; October 2022",
    sorobanRpcUrl: "https://rpc-futurenet.stellar.org",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    friendbotUrl: "https://friendbot-futurenet.stellar.org",
  },
  mainnet: {
    name: "Mainnet",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    sorobanRpcUrl: "https://soroban-rpc.mainnet.stellar.gateway.fm",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null,
  },
} as const;

// ============================================================================
// Active Network
// ============================================================================

/** The currently active network. Change this for deployment. */
export const ACTIVE_NETWORK = NETWORKS.testnet;

/** Soroban RPC URL for the active network. */
export const SOROBAN_RPC_URL = ACTIVE_NETWORK.sorobanRpcUrl;

/** Horizon API URL for the active network. */
export const HORIZON_URL = ACTIVE_NETWORK.horizonUrl;

/** Network passphrase for the active network. */
export const NETWORK_PASSPHRASE = ACTIVE_NETWORK.networkPassphrase;
export const ACTIVE_NETWORK_KEY = Object.entries(NETWORKS).find(
  ([, network]) => network.networkPassphrase === NETWORK_PASSPHRASE,
)?.[0] as keyof typeof NETWORKS | undefined;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get a Soroban RPC server instance.
 */
export function getServer(): SorobanRpc.Server {
  return new SorobanRpc.Server(SOROBAN_RPC_URL);
}

/**
 * Fund an account on testnet/futurenet using Friendbot.
 */
export async function fundAccount(address: string): Promise<boolean> {
  const friendbotUrl = ACTIVE_NETWORK.friendbotUrl;
  if (!friendbotUrl) {
    throw new Error("Friendbot not available on mainnet");
  }

  try {
    const response = await fetch(`${friendbotUrl}?addr=${address}`);
    return response.ok;
  } catch (err) {
    console.error("Failed to fund account:", err);
    return false;
  }
}

export function normalizeWalletNetwork(
  value: string,
): "testnet" | "futurenet" | "mainnet" | null {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("testnet") ||
    normalized.includes("test sdf network ; september 2015")
  ) {
    return "testnet";
  }

  if (
    normalized.includes("futurenet") ||
    normalized.includes("future network ; october 2022")
  ) {
    return "futurenet";
  }

  if (
    normalized.includes("mainnet") ||
    normalized.includes("public") ||
    normalized.includes("public global stellar network ; september 2015")
  ) {
    return "mainnet";
  }

  return null;
}

export function getWalletNetworkLabel(walletNetwork: string | null): string {
  if (!walletNetwork) {
    return "unknown";
  }

  const normalized = normalizeWalletNetwork(walletNetwork);
  if (normalized) {
    return NETWORKS[normalized].name;
  }

  return walletNetwork;
}

export function isWalletNetworkMismatch(walletNetwork: string | null): boolean {
  if (!walletNetwork || !ACTIVE_NETWORK_KEY) {
    return false;
  }

  const walletNetworkKey = normalizeWalletNetwork(walletNetwork);
  if (!walletNetworkKey) {
    return false;
  }

  return walletNetworkKey !== ACTIVE_NETWORK_KEY;
}
