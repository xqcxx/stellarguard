import { Injectable, Logger } from "@nestjs/common";
import { pool } from "../db";
import { z } from "zod";

export const ProposalSchema = z.object({
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

export interface GovernanceConfig {
  admin: string;
  member_count: number;
  quorum_percent: number;
  voting_period: number;
  proposal_count: number;
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  action: string;
  proposer: string;
  votes_for: number;
  votes_against: number;
  total_votes: number;
  status: string;
  created_at: number;
  ends_at: number;
  amount: string;
  target: string;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  async getProposals(
    page: number = 1,
    limit: number = 10,
    status?: string,
    action?: string,
  ) {
    const offset = (page - 1) * limit;
    const contractId = process.env.GOVERNANCE_CONTRACT_ID;

    if (!contractId) {
      throw new Error("GOVERNANCE_CONTRACT_ID not configured");
    }

    let query = "SELECT * FROM events WHERE contract_id = $1";
    const params: any[] = [contractId];
    let paramIndex = 2;

    // Filter by topic_2 for proposal events
    query += " AND topic_2 = $" + paramIndex++;
    params.push("propose");

    if (status) {
      // In a real implementation, you'd filter by status from event_data
      // For now, we'll just include it in the query structure
    }

    if (action) {
      // Similar to status, filter by action type from event_data
    }

    query +=
      " ORDER BY created_at DESC LIMIT $" +
      paramIndex++ +
      " OFFSET $" +
      paramIndex;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      data: result.rows.map((row) => ProposalSchema.parse(row)),
      pagination: {
        page,
        limit,
        total: result.rowCount || 0,
      },
    };
  }

  async getProposalById(id: string): Promise<Proposal | null> {
    const contractId = process.env.GOVERNANCE_CONTRACT_ID;

    if (!contractId) {
      throw new Error("GOVERNANCE_CONTRACT_ID not configured");
    }

    // In a real implementation, this would query the contract or indexed data
    // For now, return a mock proposal
    return {
      id: parseInt(id),
      title: "Sample Proposal",
      description: "This is a sample proposal",
      action: "Funding",
      proposer: "GABC...",
      votes_for: 5,
      votes_against: 2,
      total_votes: 7,
      status: "Active",
      created_at: Date.now(),
      ends_at: Date.now() + 86400000,
      amount: "1000000000",
      target: "GDEF...",
    };
  }

  async getMembers(): Promise<string[]> {
    // In a real implementation, this would query the contract
    // For now, return mock members
    return ["GABC123...", "GDEF456...", "GHIJ789..."];
  }

  async getConfig(): Promise<GovernanceConfig> {
    const contractId = process.env.GOVERNANCE_CONTRACT_ID;

    if (!contractId) {
      throw new Error("GOVERNANCE_CONTRACT_ID not configured");
    }

    // In a real implementation, this would query the contract
    return {
      admin: "GADMIN...",
      member_count: 3,
      quorum_percent: 50,
      voting_period: 1000,
      proposal_count: 10,
    };
  }

  async getProposalVotes(id: string) {
    const contractId = process.env.GOVERNANCE_CONTRACT_ID;

    if (!contractId) {
      throw new Error("GOVERNANCE_CONTRACT_ID not configured");
    }

    // Query vote events for this proposal
    const result = await pool.query(
      `SELECT * FROM events 
       WHERE contract_id = $1 
       AND topic_2 = $2 
       AND event_data->>'proposal_id' = $3
       ORDER BY created_at DESC`,
      [contractId, "vote", id],
    );

    return {
      proposal_id: parseInt(id),
      votes: result.rows.map((row) => ({
        voter: row.event_data?.voter || "unknown",
        vote_for: row.event_data?.vote_for || false,
        timestamp: row.timestamp,
      })),
      summary: {
        votes_for: result.rows.filter((r) => r.event_data?.vote_for === true)
          .length,
        votes_against: result.rows.filter(
          (r) => r.event_data?.vote_for === false,
        ).length,
        total_votes: result.rows.length,
      },
    };
  }
}
