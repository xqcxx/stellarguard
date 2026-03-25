import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  contract_id TEXT NOT NULL,
  topic_1 TEXT,
  topic_2 TEXT,
  event_data JSONB,
  ledger INTEGER NOT NULL,
  timestamp BIGINT,
  cursor TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_id);
CREATE INDEX IF NOT EXISTS idx_events_topics ON events(topic_1, topic_2);
CREATE INDEX IF NOT EXISTS idx_events_ledger ON events(ledger);
CREATE INDEX IF NOT EXISTS idx_events_cursor ON events(cursor);

CREATE TABLE IF NOT EXISTS event_cursor (
  id INTEGER PRIMARY KEY DEFAULT 1,
  cursor TEXT,
  last_ledger INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

export async function initializeSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log("Database schema initialized successfully.");
  } finally {
    client.release();
  }
}

export interface StoredEvent {
  contract_id: string;
  topic_1: string | null;
  topic_2: string | null;
  event_data: Record<string, unknown>;
  ledger: number;
  timestamp: number | null;
  cursor: string | null;
}

export async function insertEvent(event: StoredEvent): Promise<void> {
  await pool.query(
    `INSERT INTO events (contract_id, topic_1, topic_2, event_data, ledger, timestamp, cursor)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      event.contract_id,
      event.topic_1,
      event.topic_2,
      JSON.stringify(event.event_data),
      event.ledger,
      event.timestamp,
      event.cursor,
    ]
  );
}

export async function insertEvents(events: StoredEvent[]): Promise<void> {
  if (events.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const event of events) {
      await client.query(
        `INSERT INTO events (contract_id, topic_1, topic_2, event_data, ledger, timestamp, cursor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.contract_id,
          event.topic_1,
          event.topic_2,
          JSON.stringify(event.event_data),
          event.ledger,
          event.timestamp,
          event.cursor,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getLastCursor(): Promise<{
  cursor: string | null;
  lastLedger: number | null;
}> {
  const result = await pool.query(
    "SELECT cursor, last_ledger FROM event_cursor WHERE id = 1"
  );
  if (result.rows.length === 0) {
    return { cursor: null, lastLedger: null };
  }
  return {
    cursor: result.rows[0].cursor,
    lastLedger: result.rows[0].last_ledger,
  };
}

export async function updateCursor(
  cursor: string,
  lastLedger: number
): Promise<void> {
  await pool.query(
    `INSERT INTO event_cursor (id, cursor, last_ledger, updated_at)
     VALUES (1, $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET cursor = $1, last_ledger = $2, updated_at = NOW()`,
    [cursor, lastLedger]
  );
}

// When run directly, initialize the schema
if (require.main === module) {
  initializeSchema()
    .then(() => {
      console.log("Migration complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
