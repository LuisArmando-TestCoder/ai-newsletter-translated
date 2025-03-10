import { getUsersGroupedByLanguageAndCountry } from "../databaseSetup.ts";
import { sendEmails } from "../helper/emailSender.ts";
import errorLog from "../helper/errorLog.ts";
import getMailConfigPack from "../helper/getMailConfigPack.ts";
import log from "../helper/log.ts";
import { scrapeAllSources } from "./scraper.ts";
import { translateArticles } from "./translate.ts";

const processUserGroup = async (
  config: any,
  countryOfResidence: string,
  language: string,
  languagesGroup: any[]
): Promise<void> => {
  if (languagesGroup.length === 0) return;

  log(
    `Processing group for country: ${countryOfResidence}, language: ${language} with ${languagesGroup.length} user(s).`
  );

  // Find the news source matching the country.
  const source = config.newsSources.find(
    (src: any) => src.country.toUpperCase() === countryOfResidence.toUpperCase()
  );
  if (!source) {
    log(
      `No news source configured for country ${countryOfResidence}. Skipping group.`
    );
    return;
  }

  try {
    // Scrape articles and translate them concurrently.
    const articles = await scrapeAllSources(config)([source], language);
    if (!articles || articles.length === 0) {
      log(`No articles found for source: ${source.url}`);
      return;
    }
    log(
      `Scraped ${articles.length} article(s) for country: ${countryOfResidence}.`
    );

    const translatedArticles = await translateArticles(config)(
      articles,
      language
    );
    log(`Translated articles to language: ${language}.`);

    // Prepare email sending.
    const mailConfigPack = getMailConfigPack(config.email);
    const emails = languagesGroup.map((user) => user.email);

    await sendEmails({
      subscribers: emails,
      articles: translatedArticles,
      mailConfigPack,
      unsubscribeLink: `https://ai-newsletter-translated.onrender.com/unsubscribe`
    });

    log(
      `Emails sent to ${emails.length} subscriber(s) in ${countryOfResidence}.`
    );
  } catch (error) {
    errorLog(
      `Error processing group for ${countryOfResidence} - ${language}:`,
      error
    );
  }
};

export default (config: any) => async (): Promise<void> => {
  log("Starting the newsletter process...");
  try {
    const groupedUsers = await getUsersGroupedByLanguageAndCountry();

    // Process all user groups in parallel.
    await Promise.all(
      Object.entries(groupedUsers).flatMap(
        ([countryOfResidence, countriesGroup]) =>
          Object.entries(countriesGroup).map(([language, languagesGroup]) =>
            processUserGroup(
              config,
              countryOfResidence,
              language,
              languagesGroup
            )
          )
      )
    );

    log("Newsletter process completed.");
  } catch (error) {
    errorLog("Error in newsletter process:", error);
  }
};
