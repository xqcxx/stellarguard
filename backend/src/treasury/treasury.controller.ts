import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { TreasuryService } from './treasury.service';

@Controller('api/treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('balance')
  async getBalance() {
    const balance = await this.treasuryService.getBalance();
    return { balance };
  }

  @Get('config')
  async getConfig() {
    return this.treasuryService.getConfig();
  }

  @Get('transactions')
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    return this.treasuryService.getTransactions(p, l);
  }

  @Get('transactions/:id')
  async getTransaction(@Param('id') id: string) {
    const tx = await this.treasuryService.getTransactionById(id);
    if (!tx) throw new NotFoundException(`Transaction with ID ${id} not found`);
    return tx;
  }

  @Get('signers')
  async getSigners() {
    const signers = await this.treasuryService.getSigners();
    return { signers };
  }
}
