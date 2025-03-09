import express from "npm:express";
import nodemailer from "npm:nodemailer";
import { scheduleTasks } from "./cron_scheduler.ts";
import { scrapeAllSources } from "./scraper.ts";
import { translateArticles } from "./translate.ts";
import { sendEmails } from "./email_sender.ts";

import {
  addNewsletterUser,
  deleteNewsletterUser,
  getConfigDocument,
  getUsersGroupedByLanguageAndCountry,
  postConfigDocument,
  updateNewsletterUser,
} from "./database_setup.ts";
import { setupSubscriptionAPI } from "./subscription_api.ts";

/**
 * Creates a newsletter process function that orchestrates the end-to-end workflow
 * for sending newsletters. The process performs the following steps:
 *
 * 1. Retrieve newsletter users grouped by country and language.
 * 2. For each user group:
 *    a. Identify a news source matching the country's alpha-2 code.
 *    b. Scrape articles from the identified news source.
 *    c. Translate the articles into the group's language.
 *    d. Send the translated articles via email to the group.
 *
 * @example
 * const newsletterProcess = processNewsletter(config);
 * await newsletterProcess();
 *
 * @param config - The configuration object containing news sources, email settings, etc.
 * @returns A function that, when invoked, runs the newsletter process.
 */
const processNewsletter = (config) =>
  async function (): Promise<void> {
    console.log(
      `[${new Date().toISOString()}] Starting the newsletter process...`
    );

    try {
      // 1. Retrieve newsletter users grouped by country and language.
      const groupedUsers = await getUsersGroupedByLanguageAndCountry();

      // 2. Process each user group.
      for (const [countryOfResidence, countriesGroup] of Object.entries(
        groupedUsers
      )) {
        for (const [language, languagesGroup] of Object.entries(
          countriesGroup
        )) {
          if (languagesGroup.length === 0) continue;

          console.log("languagesGroup", languagesGroup);
          console.log("countryOfResidence", countryOfResidence);
          console.log("language", language);

          // a. Identify a news source matching the country.
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

          // b. Scrape articles from the matched news source.
          const articles = await scrapeAllSources(config)([source], language);
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

          // c. Translate the articles into the target language.
          const translatedArticles = await translateArticles(config)(
            articles,
            language
          );
          console.log(
            `[${new Date().toISOString()}] Translated articles to language: ${language}.`
          );

          // Destructure email configuration.
          const {
            auth,
            host,
            port,
            senderName = "No Reply",
            newsletterSubject = "Translated Articles",
          } = config.email;
          if (!host || !port || !auth?.user || !auth?.pass) {
            console.error(
              "Email configuration is incomplete. Check config.json."
            );
            Deno.exit(1);
          }

          // Create a Nodemailer transporter.
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // typically true for port 465.
            auth,
          });

          const mailConfigPack = {
            host,
            auth,
            port,
            senderName,
            newsletterSubject,
            transporter,
          };

          // d. Collect email addresses and send the newsletter.
          const emails = languagesGroup.map((user) => user.email);
          await sendEmails({
            subscribers: emails,
            articles: translatedArticles,
            mailConfigPack,
          });
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
  };

/**
 * Creates and configures the Express server, sets up API routes for managing newsletter users,
 * handles subscription/unsubscription and configuration posting, schedules the newsletter process,
 * and starts the server.
 *
 * The server exposes the following endpoints:
 *
 * - POST /users: Adds a new newsletter user.
 * - PUT /users/:email: Updates an existing newsletter user.
 * - GET /unsubscribe/:email: Unsubscribes a user.
 * - POST /config: Posts a configuration document to Firestore.
 *
 * @example
 * // Start the server by invoking createServer();
 * createServer();
 *
 * @returns A promise that resolves when the server is up and running.
 */
async function createServer() {
  const config = await getConfigDocument();
  const app = express();
  app.use(express.json());
  setupSubscriptionAPI(app);

  // Endpoint: Add New User
  app.post("/users", async (req, res) => {
    try {
      // Expected request body:
      // { email: string, name: string, bio: string, language: string, countryOfResidence: string }
      const userData = req.body;
      await addNewsletterUser(userData);
      res.status(201).json({ message: "User added successfully." });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Endpoint: Update Existing User
  app.put("/users/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const updatedUserData = req.body;
      await updateNewsletterUser(email, updatedUserData);
      res.json({ message: "User updated successfully." });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Endpoint: Unsubscribe a user via GET request.
  app.get("/unsubscribe/:email", async (req, res) => {
    try {
      const { email } = req.params;
      await deleteNewsletterUser(email);
      res.send(`
        <h1>Unsubscribed Successfully</h1>
        <p>The email <strong>${email}</strong> has been removed from our newsletter.</p>
      `);
    } catch (error) {
      console.error("Error unsubscribing user:", error);
      res.status(400).send(`
        <h1>Error</h1>
        <p>There was an issue processing your request. Please try again later.</p>
      `);
    }
  });

  // Endpoint: Post Configuration Document to Firestore.
  app.post("/config", async (req, res) => {
    try {
      const configData = req.body;
      if (!configData || typeof configData !== "object") {
        return res.status(400).json({ error: "Invalid configuration data." });
      }
      const documentId = (req.query.documentId as string) || "defaultConfig";
      await postConfigDocument(configData, documentId);
      res.status(201).json({
        message: `Configuration stored successfully with ID: ${documentId}`,
      });
    } catch (error) {
      console.error("Error posting configuration:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Schedule the newsletter process using the configuration schedule.
  scheduleTasks(processNewsletter(config), config.scheduleTime);

  // Optionally run the newsletter process immediately on startup.
  processNewsletter(config)();

  // Start the server on the configured port (default 3000).
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
