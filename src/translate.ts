import { Configuration, OpenAIApi } from 'npm:openai';
import { Article } from './types.ts';
import config from './config.ts';
import { callGPT4 } from './callChatGPT4.ts';

const translateArticle = async (article: Article): Promise<Article> => {
  if (!config.openAiApiKey) {
    throw new Error('OpenAI API key is missing');
  }

  const content = await callGPT4(`
    Translate the following article into ${config.translationLanguage}:
    
    ${article.title}
    
    While giving the following content a nice HTML structure:

    ${article.content}

    Warning: Be weary of providing only the translation of the article. 
    No notes, or anmything extra. Nothing else from your side.
  `);

  const title = await callGPT4(`
    Give me only the following sentence translated to ${config.translationLanguage}, 
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

export const translateArticles = async (articles: Article[]): Promise<Article[]> => {
  const translatedArticles = await Promise.all(
    articles.map(article => translateArticle(article))
  );
  return translatedArticles;
};