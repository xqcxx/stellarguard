import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { Public } from "../decorators/public.decorator";
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

@ApiTags("vault")
@Controller("api/vault")
@Public()
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get("locks")
  @ApiOperation({ summary: "List token locks with pagination" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (default: 10, max: 100)" })
  @ApiResponse({ status: 200, description: "Returns paginated list of token locks" })
  @ApiResponse({ status: 400, description: "Invalid pagination parameters" })
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
  @ApiOperation({ summary: "Get a token lock by ID" })
  @ApiParam({ name: "id", description: "Lock ID" })
  @ApiResponse({ status: 200, description: "Returns lock details" })
  @ApiResponse({ status: 404, description: "Lock not found" })
  async getLock(@Param("id") id: string) {
    const lock = await this.vaultService.getLockById(id);
    if (!lock) {
      throw new NotFoundException(`Lock with ID ${id} not found`);
    }
    return lock;
  }

  @Get("vestings")
  @ApiOperation({ summary: "List vesting schedules with pagination" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (default: 10, max: 100)" })
  @ApiResponse({ status: 200, description: "Returns paginated list of vesting schedules" })
  @ApiResponse({ status: 400, description: "Invalid pagination parameters" })
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
  @ApiOperation({ summary: "Get a vesting schedule by ID" })
  @ApiParam({ name: "id", description: "Vesting schedule ID" })
  @ApiResponse({ status: 200, description: "Returns vesting schedule details" })
  @ApiResponse({ status: 404, description: "Vesting schedule not found" })
  async getVesting(@Param("id") id: string) {
    const vesting = await this.vaultService.getVestingById(id);
    if (!vesting) {
      throw new NotFoundException(`Vesting schedule with ID ${id} not found`);
    }
    return vesting;
  }

  @Get("stats")
  @ApiOperation({ summary: "Get vault statistics" })
  @ApiResponse({ status: 200, description: "Returns vault statistics including total locked, total vested, and active schedules" })
  async getStats() {
    return this.vaultService.getStats();
  }
}
