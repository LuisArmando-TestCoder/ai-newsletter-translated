import * as cheerio from "npm:cheerio"; // For Deno: cheerio via NPM
import { Article, NewsSource } from "./types.ts";
import { callGPT4 } from "./callChatGPT4.ts";
import config from "./config.ts";

/**
 * Scrapes a single news source and returns an array of Article objects.
 */
async function scrapeSource(source: NewsSource): Promise<Article | undefined> {
  try {
    const { title, link } = await getMostInterestingArticle(source);

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

async function getMostInterestingArticle(source: NewsSource): Article {
  const response = await fetch(source.url);
  const html = await response.text();
  const $ = cheerio.load(html);

  // console.log("source.titleSelector", source.titleSelector);
  // console.log("source.linkSelector", source.linkSelector);
  // console.log("[...$(source.titleSelector)]", [...$(source.titleSelector)]);

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
      para un extranjero que habla ${config.translationLanguage}} 
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

  // console.log("index", index);
  // console.log("titles", titles);
  // console.log("links", links);

  return {
    title: titles[index],
    content: "",
    link: links[index] || "",
  };
}
/**
 * Scrapes all provided news sources in parallel and returns a flat array of Articles.
 */
export async function scrapeAllSources(
  sources: NewsSource[]
): Promise<Article[]> {
  const scrapePromises = sources.map((source) => scrapeSource(source));
  const articlesArrays = await Promise.all(scrapePromises);
  return articlesArrays.flat();
}

/**
 * If this file is run directly (e.g. `deno run scraper.ts`),
 * we'll attempt to load a default config and scrape all sources.
 */
// if (import.meta.main) {
//   // Option 1: If you want to load config from a local file:
//   // import config from './config.json' assert { type: 'json' };
//   // const sources = config.newsSources as NewsSource[];

//   // Option 2: Hard-code or dynamically set your sources here:
//   const sources: NewsSource[] = [
//     {
//       name: "Example News",
//       url: "https://examplenews.com",
//       articleSelector: ".article",
//       titleSelector: "h2.title",
//       contentSelector: "p.body",
//       linkSelector: "a.more-link",
//     },
//   ];

//   (async () => {
//     const articles = await scrapeAllSources(sources);
//     console.log(`Scraped ${articles.length} articles.`);

//     // Additional processing like translation or storage can be done here.
//   })();
// }
