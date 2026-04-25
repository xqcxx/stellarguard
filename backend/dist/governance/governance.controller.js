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
exports.GovernanceController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const governance_service_1 = require("./governance.service");
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
    status: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
});
let GovernanceController = class GovernanceController {
    constructor(governanceService) {
        this.governanceService = governanceService;
    }
    async getProposals(page, limit, status, action) {
        const result = paginationSchema.safeParse({ page, limit, status, action });
        if (!result.success) {
            const errors = result.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ");
            throw new common_1.BadRequestException(`Invalid parameters: ${errors}`);
        }
        return this.governanceService.getProposals(result.data.page, result.data.limit, result.data.status, result.data.action);
    }
    async getProposal(id) {
        const proposal = await this.governanceService.getProposalById(id);
        if (!proposal) {
            throw new common_1.NotFoundException(`Proposal with ID ${id} not found`);
        }
        return proposal;
    }
    async getProposalVotes(id) {
        return this.governanceService.getProposalVotes(id);
    }
    async getMembers() {
        const members = await this.governanceService.getMembers();
        return { members };
    }
    async getConfig() {
        return this.governanceService.getConfig();
    }
};
exports.GovernanceController = GovernanceController;
__decorate([
    (0, common_1.Get)("proposals"),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("status")),
    __param(3, (0, common_1.Query)("action")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], GovernanceController.prototype, "getProposals", null);
__decorate([
    (0, common_1.Get)("proposals/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GovernanceController.prototype, "getProposal", null);
__decorate([
    (0, common_1.Get)("proposals/:id/votes"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GovernanceController.prototype, "getProposalVotes", null);
__decorate([
    (0, common_1.Get)("members"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GovernanceController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Get)("config"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GovernanceController.prototype, "getConfig", null);
exports.GovernanceController = GovernanceController = __decorate([
    (0, common_1.Controller)("api/governance"),
    __metadata("design:paramtypes", [governance_service_1.GovernanceService])
], GovernanceController);
//# sourceMappingURL=governance.controller.js.map