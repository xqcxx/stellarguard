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

@ApiTags("governance")
@Controller("api/governance")
@Public()
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get("proposals")
  @ApiOperation({ summary: "List governance proposals with pagination and filters" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (default: 10, max: 100)" })
  @ApiQuery({ name: "status", required: false, type: String, description: "Filter by proposal status (e.g. open, passed, rejected)" })
  @ApiQuery({ name: "action", required: false, type: String, description: "Filter by proposal action type" })
  @ApiResponse({ status: 200, description: "Returns paginated list of proposals" })
  @ApiResponse({ status: 400, description: "Invalid pagination parameters" })
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
  @ApiOperation({ summary: "Get a proposal by ID" })
  @ApiParam({ name: "id", description: "Proposal ID" })
  @ApiResponse({ status: 200, description: "Returns proposal details" })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  async getProposal(@Param("id") id: string) {
    const proposal = await this.governanceService.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }
    return proposal;
  }

  @Get("proposals/:id/votes")
  @ApiOperation({ summary: "Get votes for a proposal" })
  @ApiParam({ name: "id", description: "Proposal ID" })
  @ApiResponse({ status: 200, description: "Returns list of votes for the proposal" })
  async getProposalVotes(@Param("id") id: string) {
    return this.governanceService.getProposalVotes(id);
  }

  @Get("members")
  @ApiOperation({ summary: "Get governance members" })
  @ApiResponse({ status: 200, description: "Returns list of governance members" })
  async getMembers() {
    const members = await this.governanceService.getMembers();
    return { members };
  }

  @Get("config")
  @ApiOperation({ summary: "Get governance configuration" })
  @ApiResponse({ status: 200, description: "Returns governance configuration including quorum, voting period, and member list" })
  async getConfig() {
    return this.governanceService.getConfig();
  }
}
