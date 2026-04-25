"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.loadConfig = loadConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "..", ".env") });
function getContractIds() {
    const ids = [];
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
function loadConfig() {
    const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/stellarguard";
    const sorobanRpcUrl = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
    const networkPassphrase = process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
    const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);
    const contractIds = getContractIds();
    if (contractIds.length === 0) {
        console.warn("Warning: No contract IDs configured. Set at least one of: " +
            "TREASURY_CONTRACT_ID, GOVERNANCE_CONTRACT_ID, TOKEN_VAULT_CONTRACT_ID, ACCESS_CONTROL_CONTRACT_ID");
    }
    return {
        databaseUrl,
        sorobanRpcUrl,
        networkPassphrase,
        contractIds,
        pollIntervalMs,
    };
}
exports.config = loadConfig();
//# sourceMappingURL=config.js.map