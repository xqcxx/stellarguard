"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const health_controller_1 = require("./health/health.controller");
const treasury_controller_1 = require("./treasury/treasury.controller");
const treasury_service_1 = require("./treasury/treasury.service");
const governance_controller_1 = require("./governance/governance.controller");
const governance_service_1 = require("./governance/governance.service");
const vault_controller_1 = require("./vault/vault.controller");
const vault_service_1 = require("./vault/vault.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [
            health_controller_1.HealthController,
            treasury_controller_1.TreasuryController,
            governance_controller_1.GovernanceController,
            vault_controller_1.VaultController,
        ],
        providers: [treasury_service_1.TreasuryService, governance_service_1.GovernanceService, vault_service_1.VaultService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map