import generateEmailContent from "./generateEmailContent.ts";
import validateEmailString from "../helper/validateEmailString.ts";
import { MailConfigPack } from "../types.ts";

/**
 * Sends an email to a single recipient using the specified mail configuration.
 *
 * @example
 * await sendEmail({
 *   recipientEmail: "recipient@example.com",
 *   subject: "Welcome!",
 *   content: "<p>Hello, welcome to our newsletter!</p>",
 *   mailConfigPack: yourMailConfigPack,
 * });
 *
 * @param recipientEmail - The target email address.
 * @param subject - The subject of the email.
 * @param content - The HTML body content of the email.
 * @param mailConfigPack - The mail configuration object, which includes transporter, sender name, authentication, and other settings.
 * @returns A promise that resolves when the email is successfully sent.
 */
export async function sendEmail({
  recipientEmail,
  subject,
  content,
  mailConfigPack,
}: {
  recipientEmail: string;
  subject: string;
  content: string;
  mailConfigPack: MailConfigPack;
}): Promise<void> {
  validateEmailString(recipientEmail, "recipientEmail");
  validateEmailString(subject, "subject");
  validateEmailString(content, "content");

  const mailOptions = {
    from: `"${mailConfigPack.senderName}" <${mailConfigPack.auth.user}>`,
    replyTo: mailConfigPack.auth.user,
    to: recipientEmail,
    subject,
    html: content,
  };

  try {
    await mailConfigPack.transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Failed to send email to ${recipientEmail}:`, error);
  }
}

/**
 * Sends emails with translated articles to multiple subscribers.
 *
 * For each subscriber, this function generates personalized email content with an unsubscribe link
 * and dispatches the email using the provided mail configuration.
 *
 * @example
 * const subscribers = ["user1@example.com", "user2@example.com"];
 * const articles = [
 *   { title: "News Update", content: "<p>Breaking news content...</p>" }
 * ];
 * await sendEmails({
 *   subscribers,
 *   articles,
 *   mailConfigPack: yourMailConfigPack,
 * });
 *
 * @param subscribers - An array of subscriber email addresses.
 * @param articles - An array of articles, each with a title and content.
 * @param mailConfigPack - The mail configuration object with necessary email settings.
 * @param unsubscribeLink - The unsubscribe base link to which the db subscriber email will be appended
 * @returns A promise that resolves when all emails have been sent.
 */
export async function sendEmails({
  subscribers,
  articles,
  mailConfigPack,
  unsubscribeLink,
}: {
  subscribers: string[];
  articles: Array<{ title: string; content: string }>;
  mailConfigPack: MailConfigPack;
  unsubscribeLink: string;
}): Promise<void> {
  if (
    !Array.isArray(subscribers) ||
    !subscribers.every((sub) => typeof sub === "string" && sub.includes("@"))
  ) {
    console.error(
      "Invalid subscribers array. Must be an array of valid email strings."
    );
    return;
  }

  if (
    !Array.isArray(articles) ||
    !articles.every(
      (article) =>
        article &&
        typeof article.title === "string" &&
        typeof article.content === "string"
    )
  ) {
    console.error(
      "Invalid articles array. Must be an array of objects with `title` and `content` strings."
    );
    return;
  }

  const subject = mailConfigPack.newsletterSubject;

  const emailPromises = subscribers.map(async (subscriber) => {
    const content = await generateEmailContent(
      articles,
      `${unsubscribeLink}/${subscriber}`
    );
    try {
      await sendEmail({
        recipientEmail: subscriber,
        subject,
        content,
        mailConfigPack,
      });
    } catch (error) {
      console.error(`Error sending email to ${subscriber}:`, error);
    }
  });

  await Promise.all(emailPromises);
  console.log("Finished sending translated articles to subscribers.");
}
