import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { GovernanceService } from "./governance.service";

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
  status: z.string().optional(),
  action: z.string().optional(),
});

@Controller("api/governance")
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get("proposals")
  async getProposals(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("action") action?: string,
  ) {
    const result = paginationSchema.safeParse({ page, limit, status, action });
    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      throw new BadRequestException(`Invalid parameters: ${errors}`);
    }

    return this.governanceService.getProposals(
      result.data.page,
      result.data.limit,
      result.data.status,
      result.data.action,
    );
  }

  @Get("proposals/:id")
  async getProposal(@Param("id") id: string) {
    const proposal = await this.governanceService.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }
    return proposal;
  }

  @Get("proposals/:id/votes")
  async getProposalVotes(@Param("id") id: string) {
    return this.governanceService.getProposalVotes(id);
  }

  @Get("members")
  async getMembers() {
    const members = await this.governanceService.getMembers();
    return { members };
  }

  @Get("config")
  async getConfig() {
    return this.governanceService.getConfig();
  }
}
