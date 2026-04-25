import { VaultService } from "./vault.service";
export declare class VaultController {
    private readonly vaultService;
    constructor(vaultService: VaultService);
    getLocks(page?: string, limit?: string): Promise<{
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
    getLock(id: string): Promise<import("./vault.service").TokenLock>;
    getVestings(page?: string, limit?: string): Promise<{
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
    getVesting(id: string): Promise<import("./vault.service").VestingSchedule>;
    getStats(): Promise<import("./vault.service").VaultStats>;
}
//# sourceMappingURL=vault.controller.d.ts.map