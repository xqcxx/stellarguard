import { SorobanRpc, Contract } from "@stellar/stellar-sdk";
import { config } from "./config";
import {
  getLastCursor,
  insertEvents,
  updateCursor,
  StoredEvent,
} from "./db";
import { parseRawEvent, ParsedEvent } from "./parser";

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

let running = true;

/**
 * Convert a ParsedEvent to a StoredEvent for database insertion.
 */
function toStoredEvent(parsed: ParsedEvent): StoredEvent {
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
function buildFilters(
  contractIds: string[]
): SorobanRpc.Api.EventFilter[] {
  return contractIds.map((id) => ({
    type: "contract" as const,
    contractIds: [id],
  }));
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch and process a batch of events from Soroban RPC.
 * Returns the number of events processed.
 */
async function pollEvents(
  server: SorobanRpc.Server,
  contractIds: string[],
  lastCursor: string | null,
  lastLedger: number | null
): Promise<{ eventsProcessed: number; newCursor: string | null; newLedger: number | null }> {
  const filters = buildFilters(contractIds);

  const requestParams: SorobanRpc.Server.GetEventsRequest = {
    filters,
    limit: 100,
  };

  // Use cursor if available, otherwise fall back to startLedger
  if (lastCursor) {
    requestParams.cursor = lastCursor;
  } else {
    requestParams.startLedger = lastLedger || 1;
  }

  const response = await server.getEvents(requestParams);
  const events = response.events || [];

  if (events.length === 0) {
    return { eventsProcessed: 0, newCursor: lastCursor, newLedger: lastLedger };
  }

  const parsedEvents: ParsedEvent[] = events.map((event) => {
    let contractId = "";
    if (event.contractId) {
      contractId =
        event.contractId instanceof Contract
          ? event.contractId.contractId()
          : String(event.contractId);
    }
    return parseRawEvent({
      contractId,
      topic: event.topic,
      value: event.value,
      ledger: event.ledger,
      pagingToken: event.pagingToken,
    });
  });

  const storedEvents = parsedEvents.map(toStoredEvent);
  await insertEvents(storedEvents);

  const lastEvent = parsedEvents[parsedEvents.length - 1];
  const newCursor = lastEvent.cursor;
  const newLedger = lastEvent.ledger;

  if (newCursor) {
    await updateCursor(newCursor, newLedger);
  }

  for (const parsed of parsedEvents) {
    const eventName = parsed.data._eventName || `${parsed.topic1}:${parsed.topic2}`;
    console.log(
      `[Ledger ${parsed.ledger}] ${eventName} from ${parsed.contractId}`
    );
  }

  return { eventsProcessed: events.length, newCursor, newLedger };
}

/**
 * Main event listener loop.
 * Polls the Soroban RPC for contract events and stores them in the database.
 */
export async function startListener(): Promise<void> {
  const { sorobanRpcUrl, contractIds, pollIntervalMs } = config;

  if (contractIds.length === 0) {
    console.error(
      "No contract IDs configured. Cannot start event listener."
    );
    return;
  }

  const server = new SorobanRpc.Server(sorobanRpcUrl);
  console.log(`Connecting to Soroban RPC at ${sorobanRpcUrl}`);
  console.log(`Watching ${contractIds.length} contract(s)`);

  // Load last cursor from DB
  let { cursor: lastCursor, lastLedger } = await getLastCursor();

  if (lastCursor) {
    console.log(`Resuming from cursor: ${lastCursor} (ledger ${lastLedger})`);
  } else {
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
    } catch (err) {
      consecutiveErrors++;
      const backoffMs = Math.min(
        BASE_BACKOFF_MS * Math.pow(2, consecutiveErrors - 1),
        MAX_BACKOFF_MS
      );

      console.error(
        `Error polling events (attempt ${consecutiveErrors}, retrying in ${backoffMs}ms):`,
        err instanceof Error ? err.message : err
      );

      await sleep(backoffMs);
    }
  }

  console.log("Event listener stopped.");
}

/**
 * Request a graceful shutdown of the listener loop.
 */
export function stopListener(): void {
  running = false;
}
