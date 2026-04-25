"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeScVal = decodeScVal;
exports.getEventName = getEventName;
exports.parseTopics = parseTopics;
exports.parseEventData = parseEventData;
exports.parseRawEvent = parseRawEvent;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
/**
 * Decode a single xdr.ScVal into a JSON-serializable value.
 * Falls back to the base64 representation when native conversion fails.
 */
function decodeScVal(scVal) {
    try {
        return (0, stellar_sdk_1.scValToNative)(scVal);
    }
    catch {
        return scVal.toXDR("base64");
    }
}
/**
 * Human-readable event name mapping based on (topic1, topic2) pairs.
 */
const EVENT_NAMES = {
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
function getEventName(topic1, topic2) {
    if (!topic1 || !topic2)
        return null;
    return EVENT_NAMES[topic1]?.[topic2] ?? null;
}
/**
 * Parse topics from a raw Soroban event.
 * Topics are an array of xdr.ScVal; we decode each to its native form.
 * The first two decoded topics are returned as string topic1 and topic2.
 */
function parseTopics(topics) {
    const decoded = topics.map((t) => decodeScVal(t));
    const topic1 = decoded.length > 0 ? String(decoded[0]) : null;
    const topic2 = decoded.length > 1 ? String(decoded[1]) : null;
    return { topic1, topic2, allTopics: decoded };
}
/**
 * Parse the event data (value) from a Soroban event.
 * Returns a JSON-serializable object.
 */
function parseEventData(value) {
    const decoded = decodeScVal(value);
    if (decoded !== null && typeof decoded === "object" && !Array.isArray(decoded)) {
        return decoded;
    }
    return { value: decoded };
}
/**
 * Full event parser that takes a raw Soroban event response entry
 * and produces a ParsedEvent.
 */
function parseRawEvent(rawEvent) {
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
//# sourceMappingURL=parser.js.map