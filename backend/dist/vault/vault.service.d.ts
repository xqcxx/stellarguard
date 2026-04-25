import { z } from "zod";
export declare const LockSchema: z.ZodObject<{
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
export interface TokenLock {
    id: number;
    owner: string;
    amount: string;
    locked_at: number;
    unlock_at: number;
    claimed: boolean;
}
export interface VestingSchedule {
    id: number;
    beneficiary: string;
    total_amount: string;
    claimed_amount: string;
    start_time: number;
    duration: number;
    cliff: number;
    claimable_amount: string;
}
export interface VaultStats {
    total_locked: string;
    total_vesting: string;
    total_claimed: string;
    active_locks: number;
    active_vestings: number;
}
export declare class VaultService {
    private readonly logger;
    getLocks(page?: number, limit?: number): Promise<{
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
    getLockById(id: string): Promise<TokenLock | null>;
    getVestings(page?: number, limit?: number): Promise<{
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
    getVestingById(id: string): Promise<VestingSchedule | null>;
    getStats(): Promise<VaultStats>;
}
//# sourceMappingURL=vault.service.d.ts.map