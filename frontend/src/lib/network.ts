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
