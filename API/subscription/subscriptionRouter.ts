import type { Express } from "npm:express";
import subscribe from "./subscribe.ts";
import unsubscribe from "./unsubscribe.ts";
import updateSubscription from "./updateSubscription.ts";

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
 * // PUT /subscribe NewsletterUser type of object
 * // GET /unsubscribe { "email": "user@example.com" }
 *
 * @param app - The Express application instance.
 */
export default (app: Express) => {
  subscribe(app);
  unsubscribe(app);
  updateSubscription(app);
};
