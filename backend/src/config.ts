import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

export interface Config {
  databaseUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
  contractIds: string[];
  pollIntervalMs: number;
}

function getContractIds(): string[] {
  const ids: string[] = [];
  const envKeys = [
    "TREASURY_CONTRACT_ID",
    "GOVERNANCE_CONTRACT_ID",
    "TOKEN_VAULT_CONTRACT_ID",
    "ACCESS_CONTROL_CONTRACT_ID",
  ];

  for (const key of envKeys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      ids.push(value.trim());
    }
  }

  return ids;
}

export function loadConfig(): Config {
  const databaseUrl =
    process.env.DATABASE_URL || "postgresql://localhost:5432/stellarguard";
  const sorobanRpcUrl =
    process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
  const networkPassphrase =
    process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
  const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);
  const contractIds = getContractIds();

  if (contractIds.length === 0) {
    console.warn(
      "Warning: No contract IDs configured. Set at least one of: " +
        "TREASURY_CONTRACT_ID, GOVERNANCE_CONTRACT_ID, TOKEN_VAULT_CONTRACT_ID, ACCESS_CONTROL_CONTRACT_ID"
    );
  }

  return {
    databaseUrl,
    sorobanRpcUrl,
    networkPassphrase,
    contractIds,
    pollIntervalMs,
  };
}

export const config = loadConfig();
