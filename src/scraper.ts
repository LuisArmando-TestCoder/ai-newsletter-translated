import * as cheerio from "npm:cheerio"; // For Deno: cheerio via NPM
import { Article, NewsSource } from "./types.ts";
import { callGPT4 } from "./callChatGPT4.ts";

/**
 * Scrapes a single news source and returns an Article object.
 *
 * @example
 * const source: NewsSource = {
 *   url: "https://example.com",
 *   titleSelector: ".article-title",
 *   linkSelector: ".article-link",
 *   contentSelector: ".article-content",
 * };
 * const article = await scrapeSource(source);
 * console.log(article);
 *
 * @param source - A news source object containing the URL and CSS selectors.
 * @returns A promise that resolves to an Article object or undefined if scraping fails.
 */
async function /* `scrapeSource` is a function that scrapes a single news source by performing the
following steps: */
scrapeSource(
  source: NewsSource,
  translationLanguage: string
): Promise<Article | undefined> {
  try {
    const { title, link } = await getMostInterestingArticle(
      source,
      translationLanguage
    );

    let composedLink = link;

    // Ensure links have absolute URLs
    if (link && !/^http(s?):\/\//.test(link)) {
      // If the link is relative, prepend the source domain
      composedLink = new URL(link, source.url).href;
    }

    const responseContent = await fetch(composedLink);
    const htmlContent = await responseContent.text();
    const $$ = cheerio.load(htmlContent);
    const content = $$(source.contentSelector).text().trim();

    let article: Article | undefined;

    if (title && content && composedLink) {
      article = {
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
}

/**
 * Determines and returns the most interesting article from a given news source using GPT-4.
 *
 * @example
 * const source: NewsSource = {
 *   url: "https://example.com",
 *   titleSelector: ".article-title",
 *   linkSelector: ".article-link",
 *   contentSelector: ".article-content",
 * };
 * const interestingArticle = await getMostInterestingArticle(source);
 * console.log(interestingArticle);
 *
 * @param source - A news source object containing the URL and CSS selectors.
 * @returns A promise that resolves to an Article object with title, an empty content string, and link.
 */
async function getMostInterestingArticle(
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
    `
    )
  ).split(":")[0];

  return {
    title: titles[index],
    content: "",
    link: links[index] || "",
  };
}

/**
 * Scrapes all provided news sources in parallel and returns a flat array of Article objects.
 *
 * @example
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
 * const articles = await scrapeAllSources(sources);
 * console.log(articles);
 *
 * @param sources - An array of NewsSource objects.
 * @returns A promise that resolves to a flat array of Article objects or undefined if none are found.
 */
export async function scrapeAllSources(
  sources: NewsSource[],
  translationLanguage: string
): Promise<Article[] | undefined> {
  const scrapePromises = sources.map((source) =>
    scrapeSource(source, translationLanguage)
  );
  const articlesArrays = await Promise.all(scrapePromises);
  return articlesArrays
    ?.filter((article): article is Article => article !== undefined)
    .flat();
}
