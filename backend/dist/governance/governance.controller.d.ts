import { GovernanceService } from "./governance.service";
export declare class GovernanceController {
    private readonly governanceService;
    constructor(governanceService: GovernanceService);
    getProposals(page?: string, limit?: string, status?: string, action?: string): Promise<{
        data: {
            cursor: string | null;
            timestamp: number | null;
            id: number;
            contract_id: string;
            topic_1: string | null;
            topic_2: string | null;
            ledger: number;
            created_at: string;
            event_data?: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getProposal(id: string): Promise<import("./governance.service").Proposal>;
    getProposalVotes(id: string): Promise<{
        proposal_id: number;
        votes: {
            voter: any;
            vote_for: any;
            timestamp: any;
        }[];
        summary: {
            votes_for: number;
            votes_against: number;
            total_votes: number;
        };
    }>;
    getMembers(): Promise<{
        members: string[];
    }>;
    getConfig(): Promise<import("./governance.service").GovernanceConfig>;
}
//# sourceMappingURL=governance.controller.d.ts.map