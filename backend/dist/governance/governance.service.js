"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GovernanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceService = exports.ProposalSchema = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("../db");
const zod_1 = require("zod");
exports.ProposalSchema = zod_1.z.object({
    id: zod_1.z.number(),
    contract_id: zod_1.z.string(),
    topic_1: zod_1.z.string().nullable(),
    topic_2: zod_1.z.string().nullable(),
    event_data: zod_1.z.any(),
    ledger: zod_1.z.number(),
    timestamp: zod_1.z.number().nullable(),
    cursor: zod_1.z.string().nullable(),
    created_at: zod_1.z.string(),
});
let GovernanceService = GovernanceService_1 = class GovernanceService {
    constructor() {
        this.logger = new common_1.Logger(GovernanceService_1.name);
    }
    async getProposals(page = 1, limit = 10, status, action) {
        const offset = (page - 1) * limit;
        const contractId = process.env.GOVERNANCE_CONTRACT_ID;
        if (!contractId) {
            throw new Error("GOVERNANCE_CONTRACT_ID not configured");
        }
        let query = "SELECT * FROM events WHERE contract_id = $1";
        const params = [contractId];
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
        const result = await db_1.pool.query(query, params);
        return {
            data: result.rows.map((row) => exports.ProposalSchema.parse(row)),
            pagination: {
                page,
                limit,
                total: result.rowCount || 0,
            },
        };
    }
    async getProposalById(id) {
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
    async getMembers() {
        // In a real implementation, this would query the contract
        // For now, return mock members
        return ["GABC123...", "GDEF456...", "GHIJ789..."];
    }
    async getConfig() {
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
    async getProposalVotes(id) {
        const contractId = process.env.GOVERNANCE_CONTRACT_ID;
        if (!contractId) {
            throw new Error("GOVERNANCE_CONTRACT_ID not configured");
        }
        // Query vote events for this proposal
        const result = await db_1.pool.query(`SELECT * FROM events 
       WHERE contract_id = $1 
       AND topic_2 = $2 
       AND event_data->>'proposal_id' = $3
       ORDER BY created_at DESC`, [contractId, "vote", id]);
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
                votes_against: result.rows.filter((r) => r.event_data?.vote_for === false).length,
                total_votes: result.rows.length,
            },
        };
    }
};
exports.GovernanceService = GovernanceService;
exports.GovernanceService = GovernanceService = GovernanceService_1 = __decorate([
    (0, common_1.Injectable)()
], GovernanceService);
//# sourceMappingURL=governance.service.js.map