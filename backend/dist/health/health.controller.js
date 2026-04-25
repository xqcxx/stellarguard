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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("../db");
const config_1 = require("../config");
let HealthController = class HealthController {
    async getHealth() {
        const timestamp = new Date().toISOString();
        const checks = {
            database: { status: "error" },
            sorobanRpc: { status: "error" },
        };
        // Check PostgreSQL connectivity
        const dbStart = Date.now();
        try {
            const client = await db_1.pool.connect();
            await client.query("SELECT 1");
            client.release();
            checks.database = {
                status: "ok",
                responseTime: Date.now() - dbStart,
            };
        }
        catch (error) {
            checks.database = {
                status: "error",
                message: error instanceof Error ? error.message : "Database connection failed",
                responseTime: Date.now() - dbStart,
            };
        }
        // Check Soroban RPC connectivity
        const rpcStart = Date.now();
        try {
            const response = await fetch(config_1.config.sorobanRpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getHealth",
                    params: [],
                }),
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });
            if (response.ok) {
                checks.sorobanRpc = {
                    status: "ok",
                    responseTime: Date.now() - rpcStart,
                };
            }
            else {
                checks.sorobanRpc = {
                    status: "error",
                    message: `RPC returned status ${response.status}`,
                    responseTime: Date.now() - rpcStart,
                };
            }
        }
        catch (error) {
            checks.sorobanRpc = {
                status: "error",
                message: error instanceof Error ? error.message : "RPC connection failed",
                responseTime: Date.now() - rpcStart,
            };
        }
        // Determine overall status
        const allOk = checks.database.status === "ok" && checks.sorobanRpc.status === "ok";
        const anyOk = checks.database.status === "ok" || checks.sorobanRpc.status === "ok";
        return {
            status: allOk ? "ok" : anyOk ? "degraded" : "error",
            timestamp,
            service: "stellarguard-api",
            checks,
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)("api/health")
], HealthController);
//# sourceMappingURL=health.controller.js.map