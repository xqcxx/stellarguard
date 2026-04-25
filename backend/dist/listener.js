"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startListener = startListener;
exports.stopListener = stopListener;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const config_1 = require("./config");
const db_1 = require("./db");
const parser_1 = require("./parser");
const MAX_BACKOFF_MS = 30000;
const BASE_BACKOFF_MS = 1000;
let running = true;
/**
 * Convert a ParsedEvent to a StoredEvent for database insertion.
 */
function toStoredEvent(parsed) {
    return {
        contract_id: parsed.contractId,
        topic_1: parsed.topic1,
        topic_2: parsed.topic2,
        event_data: parsed.data,
        ledger: parsed.ledger,
        timestamp: parsed.timestamp,
        cursor: parsed.cursor,
    };
}
/**
 * Build the event filters for the getEvents request.
 * Each contract ID gets its own filter entry.
 */
function buildFilters(contractIds) {
    return contractIds.map((id) => ({
        type: "contract",
        contractIds: [id],
    }));
}
/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Fetch and process a batch of events from Soroban RPC.
 * Returns the number of events processed.
 */
async function pollEvents(server, contractIds, lastCursor, lastLedger) {
    const filters = buildFilters(contractIds);
    const requestParams = {
        filters,
        limit: 100,
    };
    // Use cursor if available, otherwise fall back to startLedger
    if (lastCursor) {
        requestParams.cursor = lastCursor;
    }
    else {
        requestParams.startLedger = lastLedger || 1;
    }
    const response = await server.getEvents(requestParams);
    const events = response.events || [];
    if (events.length === 0) {
        return { eventsProcessed: 0, newCursor: lastCursor, newLedger: lastLedger };
    }
    const parsedEvents = events.map((event) => {
        let contractId = "";
        if (event.contractId) {
            contractId =
                event.contractId instanceof stellar_sdk_1.Contract
                    ? event.contractId.contractId()
                    : String(event.contractId);
        }
        return (0, parser_1.parseRawEvent)({
            contractId,
            topic: event.topic,
            value: event.value,
            ledger: event.ledger,
            pagingToken: event.pagingToken,
        });
    });
    const storedEvents = parsedEvents.map(toStoredEvent);
    await (0, db_1.insertEvents)(storedEvents);
    const lastEvent = parsedEvents[parsedEvents.length - 1];
    const newCursor = lastEvent.cursor;
    const newLedger = lastEvent.ledger;
    if (newCursor) {
        await (0, db_1.updateCursor)(newCursor, newLedger);
    }
    for (const parsed of parsedEvents) {
        const eventName = parsed.data._eventName || `${parsed.topic1}:${parsed.topic2}`;
        console.log(`[Ledger ${parsed.ledger}] ${eventName} from ${parsed.contractId}`);
    }
    return { eventsProcessed: events.length, newCursor, newLedger };
}
/**
 * Main event listener loop.
 * Polls the Soroban RPC for contract events and stores them in the database.
 */
async function startListener() {
    const { sorobanRpcUrl, contractIds, pollIntervalMs } = config_1.config;
    if (contractIds.length === 0) {
        console.error("No contract IDs configured. Cannot start event listener.");
        return;
    }
    const server = new stellar_sdk_1.SorobanRpc.Server(sorobanRpcUrl);
    console.log(`Connecting to Soroban RPC at ${sorobanRpcUrl}`);
    console.log(`Watching ${contractIds.length} contract(s)`);
    // Load last cursor from DB
    let { cursor: lastCursor, lastLedger } = await (0, db_1.getLastCursor)();
    if (lastCursor) {
        console.log(`Resuming from cursor: ${lastCursor} (ledger ${lastLedger})`);
    }
    else {
        console.log("No previous cursor found. Starting from the beginning.");
    }
    let consecutiveErrors = 0;
    while (running) {
        try {
            const result = await pollEvents(server, contractIds, lastCursor, lastLedger);
            if (result.eventsProcessed > 0) {
                console.log(`Processed ${result.eventsProcessed} event(s)`);
                lastCursor = result.newCursor;
                lastLedger = result.newLedger;
            }
            // Reset backoff on success
            consecutiveErrors = 0;
            await sleep(pollIntervalMs);
        }
        catch (err) {
            consecutiveErrors++;
            const backoffMs = Math.min(BASE_BACKOFF_MS * Math.pow(2, consecutiveErrors - 1), MAX_BACKOFF_MS);
            console.error(`Error polling events (attempt ${consecutiveErrors}, retrying in ${backoffMs}ms):`, err instanceof Error ? err.message : err);
            await sleep(backoffMs);
        }
    }
    console.log("Event listener stopped.");
}
/**
 * Request a graceful shutdown of the listener loop.
 */
function stopListener() {
    running = false;
}
//# sourceMappingURL=listener.js.map