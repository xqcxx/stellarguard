import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { TreasuryController } from "./treasury/treasury.controller";
import { TreasuryService } from "./treasury/treasury.service";
import { GovernanceController } from "./governance/governance.controller";
import { GovernanceService } from "./governance/governance.service";
import { VaultController } from "./vault/vault.controller";
import { VaultService } from "./vault/vault.service";

@Module({
  imports: [],
  controllers: [
    HealthController,
    TreasuryController,
    GovernanceController,
    VaultController,
  ],
  providers: [TreasuryService, GovernanceService, VaultService],
})
export class AppModule {}
