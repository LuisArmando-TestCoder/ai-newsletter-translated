import express from "npm:express"; // Express via npm in Deno
import config from "./config.ts"; // Deno import assertion for JSON
// import { initializeDatabase } from "./database_setup.ts";
// import { setupSubscriptionAPI } from "./subscription_api.ts";
// import { scheduleTasks } from "./cron_scheduler.ts";
import { scrapeAllSources } from "./scraper.ts";
import { translateArticles } from "./translate.ts";
import { sendEmails } from "../email_sender.ts";

/**
 * Orchestrates the newsletter flow:
 *   1. Scrape Articles
 *   2. Translate Articles
 *   3. Send Emails
 */
async function processNewsletter(): Promise<void> {
  console.log(
    `[${new Date().toISOString()}] Starting the newsletter process...`
  );

  try {
    // 1. Scrape articles from configured sources
    const articles = await scrapeAllSources(config.newsSources);
    console.log(
      `[${new Date().toISOString()}] Scraped ${articles.length} articles.`
    );

    // 2. Translate articles
    const translatedArticles = await translateArticles(
      articles
    );
    console.log(
      `[${new Date().toISOString()}] Translated articles to "${
        config.translationLanguage
      }".`
    );
    console.log("translatedArticle", translatedArticles[0]);

    // // 3. Send emails to subscribers
    await sendEmails([
        "luisarmando.murillobaltodano@gmail.com"
    ], translatedArticles);
    console.log(
      `[${new Date().toISOString()}] Emails sent to subscribers successfully.`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in newsletter process:`,
      error
    );
  }
}

/**
 * Initializes and starts the Express server:
 *   - Applies middlewares (JSON parsing)
 *   - Sets up subscription-related routes
 *   - Listens on the specified port
 */
function createServer(): void {
  const app = express();
  app.use(express.json());

  // Subscription API routes (subscribe, unsubscribe, status)
//   setupSubscriptionAPI(app);
    processNewsletter()
  // Start the server
  const port = config.port || 3000;
  app.listen(port, () => {
    console.log(
      `[${new Date().toISOString()}] Server is running on port ${port}`
    );
  });
}

/**
 * If this file is the main entry point, we:
 *   1. Initialize the Turso database
 *   2. Schedule newsletter tasks
 *   3. Start the Express server
 */
if (import.meta.main) {
//   initializeDatabase()
//     .then(() => {
      // Schedule the newsletter process at configured intervals
    //   scheduleTasks(processNewsletter, config.scheduleTime);

      // Spin up the server
      createServer();
    // })
    // .catch((error) => {
    //   console.error("Error initializing database:", error);
    //   Deno.exit(1);
    // });
}
