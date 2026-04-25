"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TreasuryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryService = exports.TransactionSchema = void 0;
const common_1 = require("@nestjs/common");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const config_1 = require("../config");
const db_1 = require("../db");
const zod_1 = require("zod");
// Define transaction schema for validation
exports.TransactionSchema = zod_1.z.object({
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
let TreasuryService = TreasuryService_1 = class TreasuryService {
    constructor() {
        this.logger = new common_1.Logger(TreasuryService_1.name);
        this.server = new stellar_sdk_1.SorobanRpc.Server(config_1.config.sorobanRpcUrl);
    }
    async getBalance() {
        const contractId = process.env.TREASURY_CONTRACT_ID;
        if (!contractId)
            throw new Error("TREASURY_CONTRACT_ID not configured");
        // For now, return a placeholder balance
        // In a real implementation, this would query the contract via RPC
        // or read from the indexed database
        return "1000.0000000";
    }
    async getConfig() {
        const contractId = process.env.TREASURY_CONTRACT_ID;
        if (!contractId)
            throw new Error("TREASURY_CONTRACT_ID not configured");
        // Mocking config return based on contract struct
        return {
            admin: "G...",
            threshold: 2,
            signer_count: 3,
            balance: "1000000000",
            tx_count: 10,
        };
    }
    async getTransactions(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const contractId = process.env.TREASURY_CONTRACT_ID;
        const result = await db_1.pool.query("SELECT * FROM events WHERE contract_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [contractId, limit, offset]);
        return result.rows.map((row) => exports.TransactionSchema.parse(row));
    }
    async getTransactionById(id) {
        const result = await db_1.pool.query("SELECT * FROM events WHERE id = $1", [id]);
        if (result.rows.length === 0)
            return null;
        return exports.TransactionSchema.parse(result.rows[0]);
    }
    async getSigners() {
        return ["GBVQBPV3...", "GDI67..."];
    }
};
exports.TreasuryService = TreasuryService;
exports.TreasuryService = TreasuryService = TreasuryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TreasuryService);
//# sourceMappingURL=treasury.service.js.map