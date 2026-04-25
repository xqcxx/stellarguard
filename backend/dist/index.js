"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const listener_1 = require("./listener");
async function main() {
    console.log("StellarGuard Event Listener starting...");
    // Initialize database schema
    await (0, db_1.initializeSchema)();
    // Set up graceful shutdown handlers
    const shutdown = async () => {
        console.log("\nShutting down gracefully...");
        (0, listener_1.stopListener)();
        // Allow time for the current poll cycle to complete
        setTimeout(async () => {
            await db_1.pool.end();
            console.log("Database connection closed.");
            process.exit(0);
        }, 2000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    // Start the event listener
    await (0, listener_1.startListener)();
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map