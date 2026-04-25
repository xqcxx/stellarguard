"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initializeSchema = initializeSchema;
exports.insertEvent = insertEvent;
exports.insertEvents = insertEvents;
exports.getLastCursor = getLastCursor;
exports.updateCursor = updateCursor;
const pg_1 = require("pg");
const config_1 = require("./config");
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.databaseUrl,
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
async function initializeSchema() {
    const client = await exports.pool.connect();
    try {
        await client.query(SCHEMA_SQL);
        console.log("Database schema initialized successfully.");
    }
    finally {
        client.release();
    }
}
async function insertEvent(event) {
    await exports.pool.query(`INSERT INTO events (contract_id, topic_1, topic_2, event_data, ledger, timestamp, cursor)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        event.contract_id,
        event.topic_1,
        event.topic_2,
        JSON.stringify(event.event_data),
        event.ledger,
        event.timestamp,
        event.cursor,
    ]);
}
async function insertEvents(events) {
    if (events.length === 0)
        return;
    const client = await exports.pool.connect();
    try {
        await client.query("BEGIN");
        for (const event of events) {
            await client.query(`INSERT INTO events (contract_id, topic_1, topic_2, event_data, ledger, timestamp, cursor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                event.contract_id,
                event.topic_1,
                event.topic_2,
                JSON.stringify(event.event_data),
                event.ledger,
                event.timestamp,
                event.cursor,
            ]);
        }
        await client.query("COMMIT");
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
async function getLastCursor() {
    const result = await exports.pool.query("SELECT cursor, last_ledger FROM event_cursor WHERE id = 1");
    if (result.rows.length === 0) {
        return { cursor: null, lastLedger: null };
    }
    return {
        cursor: result.rows[0].cursor,
        lastLedger: result.rows[0].last_ledger,
    };
}
async function updateCursor(cursor, lastLedger) {
    await exports.pool.query(`INSERT INTO event_cursor (id, cursor, last_ledger, updated_at)
     VALUES (1, $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET cursor = $1, last_ledger = $2, updated_at = NOW()`, [cursor, lastLedger]);
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
//# sourceMappingURL=db.js.map