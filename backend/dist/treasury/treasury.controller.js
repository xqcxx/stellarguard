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
exports.TreasuryController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const treasury_service_1 = require("./treasury.service");
const paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .default('1')
        .pipe(zod_1.z.coerce.number().int().min(1, 'Page must be 1 or greater')),
    limit: zod_1.z
        .string()
        .default('10')
        .pipe(zod_1.z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')),
});
let TreasuryController = class TreasuryController {
    constructor(treasuryService) {
        this.treasuryService = treasuryService;
    }
    async getBalance() {
        const balance = await this.treasuryService.getBalance();
        return { balance };
    }
    async getConfig() {
        return this.treasuryService.getConfig();
    }
    async getTransactions(page, limit) {
        const result = paginationSchema.safeParse({ page, limit });
        if (!result.success) {
            const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
            throw new common_1.BadRequestException(`Invalid pagination parameters: ${errors}`);
        }
        return this.treasuryService.getTransactions(result.data.page, result.data.limit);
    }
    async getTransaction(id) {
        const tx = await this.treasuryService.getTransactionById(id);
        if (!tx)
            throw new common_1.NotFoundException(`Transaction with ID ${id} not found`);
        return tx;
    }
    async getSigners() {
        const signers = await this.treasuryService.getSigners();
        return { signers };
    }
};
exports.TreasuryController = TreasuryController;
__decorate([
    (0, common_1.Get)('balance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TreasuryController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TreasuryController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TreasuryController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TreasuryController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('signers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TreasuryController.prototype, "getSigners", null);
exports.TreasuryController = TreasuryController = __decorate([
    (0, common_1.Controller)('api/treasury'),
    __metadata("design:paramtypes", [treasury_service_1.TreasuryService])
], TreasuryController);
//# sourceMappingURL=treasury.controller.js.map