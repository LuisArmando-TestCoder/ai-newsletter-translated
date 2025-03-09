import type { Request, Response, Express } from "npm:express";
import {
  addNewsletterUser,
  deleteNewsletterUser,
  getNewsletterUser,
} from "./database_setup.ts";
import type { NewsletterUser } from "./types.ts";

/**
 * Attaches subscription-related routes (subscribe, unsubscribe, and subscription-status)
 * to the provided Express application using the Firestore functions from database_setup.ts.
 *
 * @example
 * import express from "npm:express";
 * import { setupSubscriptionAPI } from "./subscription_api.ts";
 *
 * const app = express();
 * app.use(express.json());
 * setupSubscriptionAPI(app);
 *
 * // Now, you can interact with:
 * // POST /subscribe { "email": "user@example.com" }
 * // POST /unsubscribe { "email": "user@example.com" }
 * // GET /subscription-status?email=user@example.com
 *
 * @param app - The Express application instance.
 */
export function setupSubscriptionAPI(app: Express) {
  /**
   * Subscribe endpoint.
   *
   * Expects a JSON body with at least an "email" field. Optionally, you can supply
   * "name", "bio", "language", and "countryOfResidence". If not provided, defaults are:
   * - name: same as email
   * - bio: empty string
   * - language: "en"
   * - countryOfResidence: "US"
   *
   * @example
   * // Client-side using fetch:
   * fetch("/subscribe", {
   *   method: "POST",
   *   headers: { "Content-Type": "application/json" },
   *   body: JSON.stringify({ email: "user@example.com" })
   * })
   * .then(res => res.json())
   * .then(data => console.log(data));
   *
   * @param req - The Express request.
   * @param res - The Express response.
   */
  app.post("/subscribe", async (req: Request, res: Response) => {
    const { email, name, bio, language, countryOfResidence } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Use provided values or set defaults
    const user: NewsletterUser = {
      email,
      name: name || email,
      bio: bio || "",
      language: language || "en",
      countryOfResidence: countryOfResidence || "US",
    };

    try {
      // Check if the user is already subscribed
      const existingUser = await getNewsletterUser(email);
      if (existingUser) {
        return res.status(200).json({ message: "Already subscribed" });
      }
      // Add the new subscriber using the Firestore function
      await addNewsletterUser(user);
      return res.status(201).json({ message: "Subscription successful" });
    } catch (error) {
      console.error("Error subscribing user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Unsubscribe endpoint.
   *
   * Expects a JSON body with an "email" field.
   *
   * @example
   * // Client-side using fetch:
   * fetch("/unsubscribe", {
   *   method: "POST",
   *   headers: { "Content-Type": "application/json" },
   *   body: JSON.stringify({ email: "user@example.com" })
   * })
   * .then(res => res.json())
   * .then(data => console.log(data));
   *
   * @param req - The Express request.
   * @param res - The Express response.
   */
  app.post("/unsubscribe", async (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      await deleteNewsletterUser(email);
      return res.status(200).json({ message: "Unsubscription successful" });
    } catch (error) {
      console.error("Error unsubscribing user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Subscription status endpoint.
   *
   * Expects a query parameter "email", for example: /subscription-status?email=user@example.com
   *
   * @example
   * // Client-side using fetch:
   * fetch("/subscription-status?email=user@example.com")
   *   .then(res => res.json())
   *   .then(data => console.log(data));
   *
   * @param req - The Express request.
   * @param res - The Express response.
   */
  app.get("/subscription-status", async (req: Request, res: Response) => {
    const { email } = req.query || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const user = await getNewsletterUser(email);
      if (user) {
        return res.status(200).json({ email, subscribed: true });
      } else {
        return res.status(200).json({ email, subscribed: false });
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
