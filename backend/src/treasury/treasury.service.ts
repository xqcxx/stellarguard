import { Injectable, Logger } from "@nestjs/common";
import { SorobanRpc, Address, Contract } from "@stellar/stellar-sdk";
import { config } from "../config";
import { pool } from "../db";
import { z } from "zod";

// Define transaction schema for validation
export const TransactionSchema = z.object({
  id: z.number(),
  contract_id: z.string(),
  topic_1: z.string().nullable(),
  topic_2: z.string().nullable(),
  event_data: z.any(),
  ledger: z.number(),
  timestamp: z.number().nullable(),
  cursor: z.string().nullable(),
  created_at: z.string(),
});

@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);
  private readonly server: SorobanRpc.Server;

  constructor() {
    this.server = new SorobanRpc.Server(config.sorobanRpcUrl);
  }

  async getBalance(): Promise<string> {
    const contractId = process.env.TREASURY_CONTRACT_ID;
    if (!contractId) throw new Error("TREASURY_CONTRACT_ID not configured");

    // For now, return a placeholder balance
    // In a real implementation, this would query the contract via RPC
    // or read from the indexed database
    return "1000.0000000";
  }

  async getConfig() {
    const contractId = process.env.TREASURY_CONTRACT_ID;
    if (!contractId) throw new Error("TREASURY_CONTRACT_ID not configured");

    // Mocking config return based on contract struct
    return {
      admin: "G...",
      threshold: 2,
      signer_count: 3,
      balance: "1000000000",
      tx_count: 10,
    };
  }

  async getTransactions(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const contractId = process.env.TREASURY_CONTRACT_ID;

    const result = await pool.query(
      "SELECT * FROM events WHERE contract_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [contractId, limit, offset],
    );

    return result.rows.map((row) => TransactionSchema.parse(row));
  }

  async getTransactionById(id: string) {
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);

    if (result.rows.length === 0) return null;
    return TransactionSchema.parse(result.rows[0]);
  }

  async getSigners() {
    return ["GBVQBPV3...", "GDI67..."];
  }
}
