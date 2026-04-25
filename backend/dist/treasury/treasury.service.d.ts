import { z } from "zod";
export declare const TransactionSchema: z.ZodObject<{
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
export declare class TreasuryService {
    private readonly logger;
    private readonly server;
    constructor();
    getBalance(): Promise<string>;
    getConfig(): Promise<{
        admin: string;
        threshold: number;
        signer_count: number;
        balance: string;
        tx_count: number;
    }>;
    getTransactions(page?: number, limit?: number): Promise<{
        cursor: string | null;
        timestamp: number | null;
        id: number;
        contract_id: string;
        topic_1: string | null;
        topic_2: string | null;
        ledger: number;
        created_at: string;
        event_data?: any;
    }[]>;
    getTransactionById(id: string): Promise<{
        cursor: string | null;
        timestamp: number | null;
        id: number;
        contract_id: string;
        topic_1: string | null;
        topic_2: string | null;
        ledger: number;
        created_at: string;
        event_data?: any;
    } | null>;
    getSigners(): Promise<string[]>;
}
//# sourceMappingURL=treasury.service.d.ts.map