import { scValToNative, xdr } from "@stellar/stellar-sdk";

/**
 * Decode a single xdr.ScVal into a JSON-serializable value.
 * Falls back to the base64 representation when native conversion fails.
 */
export function decodeScVal(scVal: xdr.ScVal): unknown {
  try {
    return scValToNative(scVal);
  } catch {
    return scVal.toXDR("base64");
  }
}

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
 * Human-readable event name mapping based on (topic1, topic2) pairs.
 */
const EVENT_NAMES: Record<string, Record<string, string>> = {
  treasury: {
    deposit: "Treasury Deposit",
    propose: "Treasury Propose",
    approve: "Treasury Approve",
    execute: "Treasury Execute",
    init: "Treasury Initialize",
    dep_tok: "Treasury Deposit Token",
    add_sig: "Treasury Add Signer",
    rem_sig: "Treasury Remove Signer",
    thresh: "Treasury Threshold Change",
    admin: "Treasury Admin Change",
  },
  gov: {
    propose: "Governance Propose",
    vote: "Governance Vote",
    finalize: "Governance Finalize",
    exec: "Governance Execute",
    init: "Governance Initialize",
    admin: "Governance Admin Change",
    quorum: "Governance Quorum Change",
  },
  vault: {
    lock: "Vault Lock",
    claim: "Vault Claim",
    vest: "Vault Vest",
    v_claim: "Vault Vesting Claim",
  },
};

/**
 * Get the human-readable event name for a given (topic1, topic2) pair.
 */
export function getEventName(
  topic1: string | null,
  topic2: string | null
): string | null {
  if (!topic1 || !topic2) return null;
  return EVENT_NAMES[topic1]?.[topic2] ?? null;
}

/**
 * Parse topics from a raw Soroban event.
 * Topics are an array of xdr.ScVal; we decode each to its native form.
 * The first two decoded topics are returned as string topic1 and topic2.
 */
export function parseTopics(topics: xdr.ScVal[]): {
  topic1: string | null;
  topic2: string | null;
  allTopics: unknown[];
} {
  const decoded = topics.map((t) => decodeScVal(t));

  const topic1 = decoded.length > 0 ? String(decoded[0]) : null;
  const topic2 = decoded.length > 1 ? String(decoded[1]) : null;

  return { topic1, topic2, allTopics: decoded };
}

/**
 * Parse the event data (value) from a Soroban event.
 * Returns a JSON-serializable object.
 */
export function parseEventData(value: xdr.ScVal): Record<string, unknown> {
  const decoded = decodeScVal(value);

  if (decoded !== null && typeof decoded === "object" && !Array.isArray(decoded)) {
    return decoded as Record<string, unknown>;
  }

  return { value: decoded };
}

/**
 * Full event parser that takes a raw Soroban event response entry
 * and produces a ParsedEvent.
 */
export function parseRawEvent(rawEvent: {
  contractId: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
  ledger: number;
  pagingToken: string;
}): ParsedEvent {
  const { topic1, topic2, allTopics } = parseTopics(rawEvent.topic);
  const data = parseEventData(rawEvent.value);

  const eventName = getEventName(topic1, topic2);
  if (eventName) {
    data._eventName = eventName;
  }
  data._topics = allTopics;

  return {
    contractId: rawEvent.contractId,
    topic1,
    topic2,
    data,
    ledger: rawEvent.ledger,
    timestamp: null,
    cursor: rawEvent.pagingToken,
  };
}
