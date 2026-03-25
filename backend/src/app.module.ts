import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { TreasuryController } from './treasury/treasury.controller';
import { TreasuryService } from './treasury/treasury.service';

@Module({
  imports: [],
  controllers: [HealthController, TreasuryController],
  providers: [TreasuryService],
})
export class AppModule {}
