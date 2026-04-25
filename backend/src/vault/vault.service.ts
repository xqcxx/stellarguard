import { Injectable, Logger } from "@nestjs/common";
import { pool } from "../db";
import { z } from "zod";

export const LockSchema = z.object({
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

export interface TokenLock {
  id: number;
  owner: string;
  amount: string;
  locked_at: number;
  unlock_at: number;
  claimed: boolean;
}

export interface VestingSchedule {
  id: number;
  beneficiary: string;
  total_amount: string;
  claimed_amount: string;
  start_time: number;
  duration: number;
  cliff: number;
  claimable_amount: string;
}

export interface VaultStats {
  total_locked: string;
  total_vesting: string;
  total_claimed: string;
  active_locks: number;
  active_vestings: number;
}

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  async getLocks(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;

    if (!contractId) {
      throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
    }

    const result = await pool.query(
      `SELECT * FROM events 
       WHERE contract_id = $1 
       AND topic_2 = $2 
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`,
      [contractId, "lock", limit, offset],
    );

    return {
      data: result.rows.map((row) => LockSchema.parse(row)),
      pagination: {
        page,
        limit,
        total: result.rowCount || 0,
      },
    };
  }

  async getLockById(id: string): Promise<TokenLock | null> {
    const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;

    if (!contractId) {
      throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
    }

    // In a real implementation, this would query the contract or indexed data
    return {
      id: parseInt(id),
      owner: "GOWNER...",
      amount: "5000000000",
      locked_at: Date.now() - 86400000,
      unlock_at: Date.now() + 86400000 * 30,
      claimed: false,
    };
  }

  async getVestings(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;

    if (!contractId) {
      throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
    }

    const result = await pool.query(
      `SELECT * FROM events 
       WHERE contract_id = $1 
       AND topic_2 = $2 
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`,
      [contractId, "vest", limit, offset],
    );

    return {
      data: result.rows.map((row) => LockSchema.parse(row)),
      pagination: {
        page,
        limit,
        total: result.rowCount || 0,
      },
    };
  }

  async getVestingById(id: string): Promise<VestingSchedule | null> {
    const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;

    if (!contractId) {
      throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
    }

    // In a real implementation, this would query the contract
    const now = Date.now();
    const startTime = now - 86400000 * 30; // 30 days ago
    const duration = 86400000 * 365; // 1 year
    const cliff = 86400000 * 90; // 90 days

    const totalAmount = 10000000000;
    const claimedAmount = 2000000000;

    // Calculate claimable amount based on vesting schedule
    const elapsed = now - startTime;
    const vestedAmount =
      elapsed >= cliff ? Math.floor((totalAmount * elapsed) / duration) : 0;
    const claimableAmount = Math.max(0, vestedAmount - claimedAmount);

    return {
      id: parseInt(id),
      beneficiary: "GBENEF...",
      total_amount: totalAmount.toString(),
      claimed_amount: claimedAmount.toString(),
      start_time: startTime,
      duration,
      cliff,
      claimable_amount: claimableAmount.toString(),
    };
  }

  async getStats(): Promise<VaultStats> {
    const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;

    if (!contractId) {
      throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
    }

    // In a real implementation, this would aggregate from the database
    return {
      total_locked: "50000000000",
      total_vesting: "100000000000",
      total_claimed: "20000000000",
      active_locks: 15,
      active_vestings: 8,
    };
  }
}
