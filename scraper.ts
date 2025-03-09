import * as cheerio from "npm:cheerio"; // For Deno: cheerio via NPM
import { Article, NewsSource } from "./types.ts";
import { callGPT4 } from "./callChatGPT4.ts";

/**
 * Factory function that creates an asynchronous function to scrape a single news source.
 *
 * The returned function performs the following steps:
 * 1. Determines the most interesting article from the given source (using GPT-4).
 * 2. Ensures the article link is absolute.
 * 3. Fetches the article's HTML content and extracts its main content.
 * 4. Returns an Article object if all required parts are found.
 *
 * @example
 * const scrape = scrapeSource(config);
 * const source: NewsSource = {
 *   url: "https://example.com",
 *   titleSelector: ".article-title",
 *   linkSelector: ".article-link",
 *   contentSelector: ".article-content",
 * };
 * const article = await scrape(source, "en");
 * console.log(article);
 *
 * @param config - Configuration object containing API keys and other settings.
 * @returns A function that accepts a NewsSource and a translation language, and returns a Promise resolving to an Article object or undefined.
 */
const scrapeSource = (config) =>
  async function (
    source: NewsSource,
    translationLanguage: string
  ): Promise<Article | undefined> {
    try {
      const { title, link } = await getMostInterestingArticle(config)(
        source,
        translationLanguage
      );

      let composedLink = link;

      // Ensure links have absolute URLs.
      if (link && !/^http(s?):\/\//.test(link)) {
        // Prepend the source domain if the link is relative.
        composedLink = new URL(link, source.url).href;
      }

      const responseContent = await fetch(composedLink);
      const htmlContent = await responseContent.text();
      const $$ = cheerio.load(htmlContent);
      const content = $$(source.contentSelector).text().trim();

      if (title && content && composedLink) {
        const article: Article = {
          title,
          content,
          link,
        };

        console.log("article", article);
        return article;
      }
    } catch (error) {
      console.error(`Error scraping source '${source.url}':`, error);
      return;
    }
  };

/**
 * Factory function that creates an asynchronous function to determine the most interesting article
 * from a given news source using GPT-4.
 *
 * The returned function performs the following steps:
 * 1. Fetches the HTML of the source URL.
 * 2. Extracts titles and links using the provided CSS selectors.
 * 3. Uses GPT-4 to decide which article is most interesting.
 * 4. Returns an Article object with the selected title and link (content is left empty).
 *
 * @example
 * const getMostInteresting = getMostInterestingArticle(config);
 * const source: NewsSource = {
 *   url: "https://example.com",
 *   titleSelector: ".article-title",
 *   linkSelector: ".article-link",
 *   contentSelector: ".article-content",
 * };
 * const article = await getMostInteresting(source, "en");
 * console.log(article);
 *
 * @param config - Configuration object containing API keys and other settings.
 * @returns A function that accepts a NewsSource and a translation language, and returns a Promise resolving to an Article object.
 */
const getMostInterestingArticle = (config) =>
  async function (
    source: NewsSource,
    translationLanguage: string
  ): Promise<Article> {
    const response = await fetch(source.url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const titles = $(source.titleSelector)
      .toArray()
      .map((element) => $(element).text().trim());
    const links = $(source.linkSelector)
      .toArray()
      .map((element) => $(element).attr("href") || "");

    const index = (
      await callGPT4(
        `
      Dame el índice y la línea de la noticia más interesante 
      para un extranjero que habla ${translationLanguage} 
      que acaba de pasarse a vivir permanentemente en el país, 
      lo cual añada valor y contexto necesario a su estadía, 
      y lo cual le emocione por el interés que le causa en la información procedente, 
      sin información extra, 
      solo la respuesta en una oración tipo index:title, 
      sin justificaciones ni nada extra, sólo eso.
  
      ${titles.map((v, i) => `${i}: ${v}`).join("\n")}
      `,
        config.openAiApiKey
      )
    ).split(":")[0];

    return {
      title: titles[index],
      content: "",
      link: links[index] || "",
    };
  };

/**
 * Factory function that creates an asynchronous function to scrape multiple news sources in parallel.
 *
 * The returned function accepts an array of NewsSource objects and a translation language,
 * and returns a flat array of Article objects by invoking the scrapeSource function on each source.
 *
 * @example
 * const scrapeAll = scrapeAllSources(config);
 * const sources: NewsSource[] = [
 *   {
 *     url: "https://news1.com",
 *     titleSelector: ".title",
 *     linkSelector: ".link",
 *     contentSelector: ".content",
 *   },
 *   {
 *     url: "https://news2.com",
 *     titleSelector: ".title",
 *     linkSelector: ".link",
 *     contentSelector: ".content",
 *   },
 * ];
 * const articles = await scrapeAll(sources, "en");
 * console.log(articles);
 *
 * @param config - Configuration object containing API keys and other settings.
 * @returns A function that accepts an array of NewsSource objects and a translation language,
 *          and returns a Promise resolving to a flat array of Article objects, or undefined if none are found.
 */
export const scrapeAllSources = (config) =>
  async function (
    sources: NewsSource[],
    translationLanguage: string
  ): Promise<Article[] | undefined> {
    const scrapePromises = sources.map((source) =>
      scrapeSource(config)(source, translationLanguage)
    );
    const articlesArrays = await Promise.all(scrapePromises);
    return articlesArrays
      ?.filter((article): article is Article => article !== undefined)
      .flat();
  };
