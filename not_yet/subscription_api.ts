// subscription_api.ts

import type { Request, Response, Express } from "npm:express";
// We assume you have a shared database connection from "database_setup.ts"
import { db } from "./database_setup.ts";

/**
 * Attaches subscription-related routes (subscribe, unsubscribe, status) to the provided Express app.
 *
 * @param app The existing Express application
 */
export function setupSubscriptionAPI(app: Express) {
  /**
   * Subscribe endpoint
   * Expects JSON body: { "email": "user@example.com" }
   */
  app.post("/subscribe", async (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // Insert or update "subscribed" status to 1
      db.query(
        `INSERT INTO subscribers (email, subscribed) VALUES (?, 1)
         ON CONFLICT(email) DO UPDATE SET subscribed=1`,
        [email]
      );
      return res.status(200).json({ message: "Subscription successful" });
    } catch (error) {
      console.error("Error subscribing user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Unsubscribe endpoint
   * Expects JSON body: { "email": "user@example.com" }
   */
  app.post("/unsubscribe", async (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      db.query(`UPDATE subscribers SET subscribed = 0 WHERE email = ?`, [
        email,
      ]);
      // Check if any row was updated
      if (db.changes === 0) {
        return res.status(404).json({ error: "Email not found" });
      }
      return res.status(200).json({ message: "Unsubscription successful" });
    } catch (error) {
      console.error("Error unsubscribing user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Subscription status endpoint
   * Expects a query param: /subscription-status?email=user@example.com
   */
  app.get("/subscription-status", async (req: Request, res: Response) => {
    const { email } = req.query || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const [row] = db.query<[number]>(
        "SELECT subscribed FROM subscribers WHERE email = ?",
        [email]
      );
      if (!row) {
        return res.status(404).json({ error: "Email not found" });
      }

      // row is an array of columns; row[0] is the 'subscribed' value
      const subscribed = row[0] === 1;
      return res.status(200).json({ email, subscribed });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
