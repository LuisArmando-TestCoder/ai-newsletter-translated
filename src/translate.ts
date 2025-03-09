import { Configuration, OpenAIApi } from "npm:openai";
import { Article } from "./types.ts";
import config from "./config.ts";
import { callGPT4 } from "./callChatGPT4.ts";

/**
 * Translates a single article into the language specified in the configuration.
 * Uses GPT-4 to translate both the title and content of the article.
 *
 * @example
 * // Example usage:
 * const originalArticle: Article = {
 *   title: "Breaking News",
 *   content: "This is the content of the article.",
 *   link: "https://example.com/article"
 * };
 * const translatedArticle = await translateArticle(originalArticle);
 * console.log(translatedArticle.title);
 * console.log(translatedArticle.content);
 *
 * @param {Article} article - The article object to translate.
 * @param {Article} article - The article target language to translate to.
 * @returns {Promise<Article>} A promise that resolves to the translated article.
 * @throws {Error} If the OpenAI API key is missing.
 */
const translateArticle = async (
  article: Article,
  translationLanguage: string
): Promise<Article> => {
  if (!config.openAiApiKey) {
    throw new Error("OpenAI API key is missing");
  }

  const content = await callGPT4(`
    Translate the following article into ${translationLanguage}:
    
    ${article.title}
    
    While giving the following content a nice HTML structure, 
    where the most important keywords are highlighted in #ff6347 bold,
    making it friendly for people with ADHD:

    ${article.content}

    Warning: Be weary of providing only the translation of the article. 
    No notes, or anmything extra. Nothing else from your side.
  `);

  const title = await callGPT4(`
    Give me only the following sentence translated to ${translationLanguage}, 
    and no surrounded by anything else, 
    no quotes, no extra explanations, only the sentence nude:

    ${article.title}
  `);

  return {
    ...article,
    content: content.replaceAll("```html", "").replaceAll("```", ""),
    title,
  };
};

/**
 * Translates an array of articles into the language specified in the configuration.
 * Calls `translateArticle` for each article in parallel.
 *
 * @example
 * // Example usage:
 * const articles: Article[] = [
 *   {
 *     title: "Article One",
 *     content: "Content for article one.",
 *     link: "https://example.com/one"
 *   },
 *   {
 *     title: "Article Two",
 *     content: "Content for article two.",
 *     link: "https://example.com/two"
 *   }
 * ];
 * const translatedArticles = await translateArticles(articles);
 * console.log(translatedArticles);
 *
 * @param {Article[]} articles - An array of articles to translate.
 * @returns {Promise<Article[]>} A promise that resolves to an array of translated articles.
 */
export const translateArticles = async (
  articles: Article[],
  language: string
): Promise<Article[]> => {
  const translatedArticles = await Promise.all(
    articles.map((article) => translateArticle(article, language))
  );
  return translatedArticles;
};
