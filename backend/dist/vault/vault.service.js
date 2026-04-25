"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VaultService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultService = exports.LockSchema = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("../db");
const zod_1 = require("zod");
exports.LockSchema = zod_1.z.object({
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
let VaultService = VaultService_1 = class VaultService {
    constructor() {
        this.logger = new common_1.Logger(VaultService_1.name);
    }
    async getLocks(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;
        if (!contractId) {
            throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
        }
        const result = await db_1.pool.query(`SELECT * FROM events 
       WHERE contract_id = $1 
       AND topic_2 = $2 
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`, [contractId, "lock", limit, offset]);
        return {
            data: result.rows.map((row) => exports.LockSchema.parse(row)),
            pagination: {
                page,
                limit,
                total: result.rowCount || 0,
            },
        };
    }
    async getLockById(id) {
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
    async getVestings(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const contractId = process.env.TOKEN_VAULT_CONTRACT_ID;
        if (!contractId) {
            throw new Error("TOKEN_VAULT_CONTRACT_ID not configured");
        }
        const result = await db_1.pool.query(`SELECT * FROM events 
       WHERE contract_id = $1 
       AND topic_2 = $2 
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`, [contractId, "vest", limit, offset]);
        return {
            data: result.rows.map((row) => exports.LockSchema.parse(row)),
            pagination: {
                page,
                limit,
                total: result.rowCount || 0,
            },
        };
    }
    async getVestingById(id) {
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
        const vestedAmount = elapsed >= cliff ? Math.floor((totalAmount * elapsed) / duration) : 0;
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
    async getStats() {
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
};
exports.VaultService = VaultService;
exports.VaultService = VaultService = VaultService_1 = __decorate([
    (0, common_1.Injectable)()
], VaultService);
//# sourceMappingURL=vault.service.js.map