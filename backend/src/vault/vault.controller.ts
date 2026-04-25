import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { VaultService } from "./vault.service";

const paginationSchema = z.object({
  page: z
    .string()
    .default("1")
    .pipe(z.coerce.number().int().min(1, "Page must be 1 or greater")),
  limit: z
    .string()
    .default("10")
    .pipe(
      z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100"),
    ),
});

@Controller("api/vault")
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get("locks")
  async getLocks(@Query("page") page?: string, @Query("limit") limit?: string) {
    const result = paginationSchema.safeParse({ page, limit });
    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      throw new BadRequestException(`Invalid pagination parameters: ${errors}`);
    }

    return this.vaultService.getLocks(result.data.page, result.data.limit);
  }

  @Get("locks/:id")
  async getLock(@Param("id") id: string) {
    const lock = await this.vaultService.getLockById(id);
    if (!lock) {
      throw new NotFoundException(`Lock with ID ${id} not found`);
    }
    return lock;
  }

  @Get("vestings")
  async getVestings(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const result = paginationSchema.safeParse({ page, limit });
    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      throw new BadRequestException(`Invalid pagination parameters: ${errors}`);
    }

    return this.vaultService.getVestings(result.data.page, result.data.limit);
  }

  @Get("vestings/:id")
  async getVesting(@Param("id") id: string) {
    const vesting = await this.vaultService.getVestingById(id);
    if (!vesting) {
      throw new NotFoundException(`Vesting schedule with ID ${id} not found`);
    }
    return vesting;
  }

  @Get("stats")
  async getStats() {
    return this.vaultService.getStats();
  }
}
