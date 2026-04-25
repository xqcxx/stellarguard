import { xdr } from "@stellar/stellar-sdk";
/**
 * Decode a single xdr.ScVal into a JSON-serializable value.
 * Falls back to the base64 representation when native conversion fails.
 */
export declare function decodeScVal(scVal: xdr.ScVal): unknown;
/**
 * Decoded representation of a Soroban contract event.
 */
export interface ParsedEvent {
    contractId: string;
    topic1: string | null;
    topic2: string | null;
    data: Record<string, unknown>;
    ledger: number;
    timestamp: number | null;
    cursor: string | null;
}
/**
 * Get the human-readable event name for a given (topic1, topic2) pair.
 */
export declare function getEventName(topic1: string | null, topic2: string | null): string | null;
/**
 * Parse topics from a raw Soroban event.
 * Topics are an array of xdr.ScVal; we decode each to its native form.
 * The first two decoded topics are returned as string topic1 and topic2.
 */
export declare function parseTopics(topics: xdr.ScVal[]): {
    topic1: string | null;
    topic2: string | null;
    allTopics: unknown[];
};
/**
 * Parse the event data (value) from a Soroban event.
 * Returns a JSON-serializable object.
 */
export declare function parseEventData(value: xdr.ScVal): Record<string, unknown>;
/**
 * Full event parser that takes a raw Soroban event response entry
 * and produces a ParsedEvent.
 */
export declare function parseRawEvent(rawEvent: {
    contractId: string;
    topic: xdr.ScVal[];
    value: xdr.ScVal;
    ledger: number;
    pagingToken: string;
}): ParsedEvent;
//# sourceMappingURL=parser.d.ts.map