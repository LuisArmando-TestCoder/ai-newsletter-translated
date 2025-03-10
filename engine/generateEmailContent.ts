import evalDenoFile from "../helper/evalDenoFile.ts";

/**
 * Builds an HTML-formatted string containing the newsletter articles along with an unsubscribe link.
 *
 * @example
 * const articles = [
 *   { title: "News 1", content: "<p>Content for news 1</p>" },
 *   { title: "News 2", content: "<p>Content for news 2</p>" }
 * ];
 * const unsubscribeLink = "https://yourdomain.com/unsubscribe?email=user@example.com";
 * const emailHtml = await generateEmailContent(articles, unsubscribeLink);
 * console.log(emailHtml);
 *
 * @param articles - An array of article objects.
 * @param unsubscribeLink - The URL for unsubscribing.
 * @returns {Promise<string>} The generated email HTML.
 */
export default async function generateEmailContent(
  articles: Array<{ title: string; content: string }>,
  unsubscribeLink: string
): Promise<string> {
  const email = await evalDenoFile("./templates/newsletterEmail.html", {
    articles,
    unsubscribeLink,
  });
  return email || "";
}
