import { z } from "zod";
export declare const ProposalSchema: z.ZodObject<{
    id: z.ZodNumber;
    contract_id: z.ZodString;
    topic_1: z.ZodNullable<z.ZodString>;
    topic_2: z.ZodNullable<z.ZodString>;
    event_data: z.ZodAny;
    ledger: z.ZodNumber;
    timestamp: z.ZodNullable<z.ZodNumber>;
    cursor: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cursor: string | null;
    timestamp: number | null;
    id: number;
    contract_id: string;
    topic_1: string | null;
    topic_2: string | null;
    ledger: number;
    created_at: string;
    event_data?: any;
}, {
    cursor: string | null;
    timestamp: number | null;
    id: number;
    contract_id: string;
    topic_1: string | null;
    topic_2: string | null;
    ledger: number;
    created_at: string;
    event_data?: any;
}>;
export interface GovernanceConfig {
    admin: string;
    member_count: number;
    quorum_percent: number;
    voting_period: number;
    proposal_count: number;
}
export interface Proposal {
    id: number;
    title: string;
    description: string;
    action: string;
    proposer: string;
    votes_for: number;
    votes_against: number;
    total_votes: number;
    status: string;
    created_at: number;
    ends_at: number;
    amount: string;
    target: string;
}
export declare class GovernanceService {
    private readonly logger;
    getProposals(page?: number, limit?: number, status?: string, action?: string): Promise<{
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
    getProposalById(id: string): Promise<Proposal | null>;
    getMembers(): Promise<string[]>;
    getConfig(): Promise<GovernanceConfig>;
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
}
//# sourceMappingURL=governance.service.d.ts.map