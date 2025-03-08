// database_setup.ts

import { Database } from "npm:turso-sdk"; // Use npm: prefix in Deno
import config from "../../config"

/**
 * Initializes the Turso database:
 *   1. Reads the DB URL & token from env or config.
 *   2. Connects to the database.
 *   3. Ensures "subscribers" table exists.
 *   4. Disconnects after setup.
 */
export async function initializeDatabase(): Promise<void> {
  // Load database connection details from environment or config
  const dbUrl = Deno.env.get("TURSO_DB_URL") || config?.database?.url;
  const dbToken = Deno.env.get("TURSO_DB_TOKEN") || config?.database?.token;

  if (!dbUrl || !dbToken) {
    console.error("Database URL or token is missing.");
    Deno.exit(1);
  }

  // Create a new Turso Database instance
  const db = new Database(dbUrl, { apiKey: dbToken });

  try {
    // Attempt to connect to the database
    const connection = await db.connect();
    if (!connection) {
      console.error("Failed to establish a database connection.");
      Deno.exit(1);
    }

    // Check if the "subscribers" table exists
    const tableExists = await db.schema.hasTable("subscribers");
    if (!tableExists) {
      await db.schema.createTable("subscribers", {
        // Example table schema
        id: { type: "string", primaryKey: true },
        email: { type: "string", unique: true, notNull: true },
        created_at: {
          type: "timestamp",
          defaultValue: { type: "function", name: "CURRENT_TIMESTAMP" },
        },
      });

      console.log("Turso database initialized successfully.");
    } else {
      console.log("The 'subscribers' table already exists.");
    }
  } catch (error) {
    console.error(
      "Error initializing Turso database:",
      error instanceof Error ? error.message : error
    );
    Deno.exit(1);
  } finally {
    // Close the DB connection after setup
    await db.disconnect();
  }
}

// If this file is run directly (e.g. `deno run database_setup.ts`),
// we initialize the database setup process.
if (import.meta.main) {
  initializeDatabase().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  });
}
