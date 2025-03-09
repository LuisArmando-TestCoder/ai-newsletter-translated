/**
 * Builds an HTML-formatted string containing the newsletter articles along with an unsubscribe button.
 *
 * @example
 * // Example usage:
 * const articles = [
 *   { title: "News 1", content: "<p>Content for news 1</p>" },
 *   { title: "News 2", content: "<p>Content for news 2</p>" }
 * ];
 * const unsubscribeLink = "https://yourdomain.com/unsubscribe?email=user@example.com";
 * const emailHtml = generateEmailContent(articles, unsubscribeLink);
 * console.log(emailHtml);
 *
 * @param articles - An array of article objects (each must contain a title & content).
 * @param unsubscribeLink - The URL that users will be directed to in order to unsubscribe.
 * @returns An HTML string that can be used as email content.
 */
export default function generateEmailContent(
  articles: Array<{ title: string; content: string }>,
  unsubscribeLink: string
): string {
  return `
        <div style="margin:0;padding:0;background-color:#f4f4f4;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0;padding:0;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <!-- Main container table -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
                  <!-- Header Section -->
                  <tr>
                    <td align="center" style="background-color:#000000; padding: 20px;">
                      <h1 style="margin:0;color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:28px;">
                        Latest News
                      </h1>
                    </td>
                  </tr>
    
                  <!-- Greeting Section -->
                  <tr>
                    <td style="padding: 20px; font-family:Arial, Helvetica, sans-serif;">
                      <p style="margin:0;font-size:16px;color:#333333;line-height:1.5;">
                        Hi, Mudanzas Internacionales community,
                      </p>
                    </td>
                  </tr>
    
                  <!-- Articles Section -->
                  ${articles
                    .map((article, index) => {
                      // Guard against invalid content
                      if (
                        typeof article.title !== "string" ||
                        typeof article.content !== "string"
                      ) {
                        console.error(
                          `Invalid article content at index ${index}`
                        );
                        return "";
                      }

                      return `
                          <tr>
                            <td style="padding: 20px; font-family:Arial, Helvetica, sans-serif; border-top:1px solid #eaeaea;">
                              <div style="font-size:14px;color:#333333;line-height:1.6;">
                                ${article.content}
                              </div>
                              <p style="font-size:12px;color:#555555;margin-top:10px;">
                                <em>I translated this news for you, with care. – Pablo Arias</em>
                              </p>
                            </td>
                          </tr>
                        `;
                    })
                    .join("")}
    
                  <!-- Footer Section -->
                  <tr>
                    <td align="center" style="background-color:#000000; padding: 20px; color:#ffffff; font-family:Arial, Helvetica, sans-serif;">
                      <p style="margin:0;font-size:14px;">
                        &copy; ${new Date().getFullYear()} Mudanzas Internacionales<br/>
                        1234 Moving Street, Worldwide
                      </p>
                    </td>
                  </tr>
    
                  <!-- Unsubscribe Section -->
                  <tr>
                    <td align="center" style="padding: 10px; font-family:Arial, Helvetica, sans-serif;">
                      <a href="${unsubscribeLink}" style="color:#000000;text-decoration:underline;font-size:12px;">Unsubscribe from this newsletter</a>
                    </td>
                  </tr>
                </table>
                <!-- End main container table -->
              </td>
            </tr>
          </table>
        </div>
      `;
}
