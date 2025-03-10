import { Article } from "../types.ts";

import { callGPT4 } from "../helper/callChatGPT4.ts";

/**
 * Creates an async function that translates a single article into a target language using GPT-4.
 *
 * The returned function accepts an Article object and a translation language string. It uses the provided
 * OpenAI API key from the configuration to translate the article's title and content. The translated content
 * is then cleaned up (removing markdown fences) before being returned.
 *
 * @example
 * const translate = translateArticle(config);
 * const article: Article = {
 *   title: "Breaking News",
 *   content: "This is the content of the article.",
 *   link: "https://example.com/article"
 * };
 * const translatedArticle = await translate(article, "es");
 * console.log(translatedArticle.title);
 * console.log(translatedArticle.content);
 *
 * @param config - A configuration object that must include an `openAiApiKey`.
 * @returns An asynchronous function that takes an Article and a target language, and returns a Promise resolving to the translated Article.
 * @throws {Error} If the configuration is missing an OpenAI API key.
 */
const translateArticle =
  (config) =>
  async (article: Article, translationLanguage: string): Promise<Article> => {
    if (!config.openAiApiKey) {
      throw new Error("OpenAI API key is missing");
    }

    const content = await callGPT4(
      `
      Translate the following article into ${translationLanguage}:
      
      ${article.title}
      
      While giving the following content a nice HTML structure, 
      where the most important keywords are highlighted in #ff6347 bold,
      making it friendly for people with ADHD:

      ${article.content}

      Warning: Be wary of providing only the translation of the article. 
      No notes or any extra text should be added. 
      Exclude any links present inside the article.
      `,
      config.openAiApiKey
    );

    const title = await callGPT4(
      `
      Provide only the translation of the following sentence to ${translationLanguage} without any additional text:
      
      ${article.title}
      `,
      config.openAiApiKey
    );

    return {
      ...article,
      content: content.replaceAll("```html", "").replaceAll("```", ""),
      title,
    };
  };

/**
 * Creates an async function that translates an array of articles into a specified language.
 *
 * This function processes all articles concurrently by mapping each article through the function
 * returned by `translateArticle`. The result is an array of translated Article objects.
 *
 * @example
 * const translateAll = translateArticles(config);
 * const articles: Article[] = [
 *   { title: "Article One", content: "Content for article one.", link: "https://example.com/one" },
 *   { title: "Article Two", content: "Content for article two.", link: "https://example.com/two" }
 * ];
 * const translatedArticles = await translateAll(articles, "fr");
 * console.log(translatedArticles);
 *
 * @param config - A configuration object that includes the required `openAiApiKey`.
 * @returns An asynchronous function that takes an array of Articles and a target language,
 *          returning a Promise resolving to an array of translated Articles.
 */
export const translateArticles =
  (config) =>
  async (articles: Article[], language: string): Promise<Article[]> => {
    const translatedArticles = await Promise.all(
      articles.map((article) => translateArticle(config)(article, language))
    );
    return translatedArticles;
  };
