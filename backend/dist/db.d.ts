import { Pool } from "pg";
export declare const pool: Pool;
export declare function initializeSchema(): Promise<void>;
export interface StoredEvent {
    contract_id: string;
    topic_1: string | null;
    topic_2: string | null;
    event_data: Record<string, unknown>;
    ledger: number;
    timestamp: number | null;
    cursor: string | null;
}
export declare function insertEvent(event: StoredEvent): Promise<void>;
export declare function insertEvents(events: StoredEvent[]): Promise<void>;
export declare function getLastCursor(): Promise<{
    cursor: string | null;
    lastLedger: number | null;
}>;
export declare function updateCursor(cursor: string, lastLedger: number): Promise<void>;
//# sourceMappingURL=db.d.ts.map