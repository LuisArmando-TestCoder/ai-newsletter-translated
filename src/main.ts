import express from "npm:express";
import config from "./config.ts";
import { scheduleTasks } from "./cron_scheduler.ts";
import { scrapeAllSources } from "./scraper.ts";
import { translateArticles } from "./translate.ts";
import { sendEmails } from "./email_sender.ts";

import {
  addNewsletterUser,
  deleteNewsletterUser,
  getUsersGroupedByLanguageAndCountry,
  updateNewsletterUser,
} from "./database_setup.ts";
import { setupSubscriptionAPI } from "./subscription_api.ts";

/**
 * Orchestrates the newsletter flow:
 *   1. Retrieve newsletter users grouped by country and language.
 *   2. For each group:
 *       a. Find the news source matching the user's country (if available).
 *       b. Scrape articles from that source.
 *       c. Translate articles to the group’s language.
 *       d. Send emails to the group.
 *
 * @example
 * // To run the newsletter process independently:
 * await processNewsletter();
 *
 * @returns {Promise<void>} A promise that resolves when the process is complete.
 */
async function processNewsletter(): Promise<void> {
  console.log(
    `[${new Date().toISOString()}] Starting the newsletter process...`
  );

  try {
    // 1. Get newsletter users grouped by country and language.
    // Each group is an object where keys are languages and values are arrays of users.
    const groupedUsers = await getUsersGroupedByLanguageAndCountry();

    // 2. Iterate over each user group.
    for (const [countryOfResidence, countriesGroup] of Object.entries(
      groupedUsers
    )) {
      // Iterate through each language group within the country.
      for (const [language, languagesGroup] of Object.entries(countriesGroup)) {
        if (languagesGroup.length === 0) continue;

        console.log("languagesGroup", languagesGroup);
        console.log("countryOfResidence", countryOfResidence);
        console.log("language", language);

        // Find the news source that has the same country alpha-2 code.
        const source = config.newsSources.find(
          (src) =>
            src.country.toUpperCase() === countryOfResidence.toUpperCase()
        );

        if (!source) {
          console.log(
            `[${new Date().toISOString()}] No news source configured for country ${countryOfResidence}. Skipping group.`
          );
          continue;
        }

        console.log(
          `[${new Date().toISOString()}] Processing group for country: ${countryOfResidence}, language: ${language} with ${
            languagesGroup.length
          } user(s).`
        );

        // 3a. Scrape articles from the matched news source.
        const articles = await scrapeAllSources([source], language);
        if (!articles || articles.length === 0) {
          console.log(
            `[${new Date().toISOString()}] No articles found for source: ${
              source.url
            }`
          );
          continue;
        }
        console.log(
          `[${new Date().toISOString()}] Scraped ${
            articles.length
          } article(s) for country: ${countryOfResidence}.`
        );

        // 3b. Translate articles into the user group’s language.
        const translatedArticles = await translateArticles(articles, language);
        console.log(
          `[${new Date().toISOString()}] Translated articles to language: ${language}.`
        );

        // 3c. Extract the list of emails from the user group.
        const emails = languagesGroup.map((user) => user.email);

        // 3d. Send the translated articles via email.
        await sendEmails(emails, translatedArticles);
        console.log(
          `[${new Date().toISOString()}] Emails sent to ${
            emails.length
          } subscriber(s) in ${countryOfResidence}.`
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in newsletter process:`,
      error
    );
  }
}

/**
 * Creates and configures the Express server, sets up API routes for managing newsletter users,
 * schedules the newsletter process, and starts the server.
 *
 * @example
 * // To start the server, simply call:
 * createServer();
 *
 * @returns {void}
 */
function createServer(): void {
  const app = express();
  app.use(express.json());
  setupSubscriptionAPI(app);

  // -----------------------------
  // 1) Add New User
  // -----------------------------
  app.post("/users", async (req, res) => {
    try {
      // The request body should include all required fields:
      // {
      //   email: string;
      //   name: string;
      //   bio: string;
      //   language: string; // 2-letter code
      //   countryOfResidence: string; // 2-letter code
      // }
      const userData = req.body;
      await addNewsletterUser(userData);
      res.status(201).json({ message: "User added successfully." });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // -----------------------------
  // 2) Update Existing User
  // -----------------------------
  app.put("/users/:email", async (req, res) => {
    try {
      const { email } = req.params; // Current user email (document ID)
      const updatedUserData = req.body; // Partial user data to update
      await updateNewsletterUser(email, updatedUserData);
      res.json({ message: "User updated successfully." });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // -----------------------------
  // 3) Delete User
  // -----------------------------
  app.delete("/users/:email", async (req, res) => {
    try {
      const { email } = req.params; // Current user email (document ID)
      await deleteNewsletterUser(email);
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Schedule the newsletter task
  scheduleTasks(processNewsletter, config.scheduleTime);

  // Optionally run the newsletter process immediately on startup
  processNewsletter();

  // Start the server
  const port = config.port || 3000;
  app.listen(port, () => {
    console.log(
      `[${new Date().toISOString()}] Server is running on port ${port}`
    );
  });
}

if (import.meta.main) {
  createServer();
}
