import { initializeSchema, pool } from "./db";
import { startListener, stopListener } from "./listener";

async function main(): Promise<void> {
  console.log("StellarGuard Event Listener starting...");

  // Initialize database schema
  await initializeSchema();

  // Set up graceful shutdown handlers
  const shutdown = async () => {
    console.log("\nShutting down gracefully...");
    stopListener();

    // Allow time for the current poll cycle to complete
    setTimeout(async () => {
      await pool.end();
      console.log("Database connection closed.");
      process.exit(0);
    }, 2000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start the event listener
  await startListener();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
