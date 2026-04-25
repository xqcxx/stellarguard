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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const vault_service_1 = require("./vault.service");
const paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .default("1")
        .pipe(zod_1.z.coerce.number().int().min(1, "Page must be 1 or greater")),
    limit: zod_1.z
        .string()
        .default("10")
        .pipe(zod_1.z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100")),
});
let VaultController = class VaultController {
    constructor(vaultService) {
        this.vaultService = vaultService;
    }
    async getLocks(page, limit) {
        const result = paginationSchema.safeParse({ page, limit });
        if (!result.success) {
            const errors = result.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ");
            throw new common_1.BadRequestException(`Invalid pagination parameters: ${errors}`);
        }
        return this.vaultService.getLocks(result.data.page, result.data.limit);
    }
    async getLock(id) {
        const lock = await this.vaultService.getLockById(id);
        if (!lock) {
            throw new common_1.NotFoundException(`Lock with ID ${id} not found`);
        }
        return lock;
    }
    async getVestings(page, limit) {
        const result = paginationSchema.safeParse({ page, limit });
        if (!result.success) {
            const errors = result.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ");
            throw new common_1.BadRequestException(`Invalid pagination parameters: ${errors}`);
        }
        return this.vaultService.getVestings(result.data.page, result.data.limit);
    }
    async getVesting(id) {
        const vesting = await this.vaultService.getVestingById(id);
        if (!vesting) {
            throw new common_1.NotFoundException(`Vesting schedule with ID ${id} not found`);
        }
        return vesting;
    }
    async getStats() {
        return this.vaultService.getStats();
    }
};
exports.VaultController = VaultController;
__decorate([
    (0, common_1.Get)("locks"),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "getLocks", null);
__decorate([
    (0, common_1.Get)("locks/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "getLock", null);
__decorate([
    (0, common_1.Get)("vestings"),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "getVestings", null);
__decorate([
    (0, common_1.Get)("vestings/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "getVesting", null);
__decorate([
    (0, common_1.Get)("stats"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "getStats", null);
exports.VaultController = VaultController = __decorate([
    (0, common_1.Controller)("api/vault"),
    __metadata("design:paramtypes", [vault_service_1.VaultService])
], VaultController);
//# sourceMappingURL=vault.controller.js.map