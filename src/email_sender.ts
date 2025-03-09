import nodemailer from "npm:nodemailer";
import config from "./config.ts";
import generateEmailContent from "./generate_email_content.ts";

/**
 * Validates that a given value is a non-empty string.
 * Throws an error if invalid.
 *
 * @example
 * // Valid usage:
 * validateEmailString("example@example.com", "email");
 *
 * // Invalid usage (throws an error):
 * validateEmailString("", "email");
 *
 * @param value - The value to validate.
 * @param fieldName - The field name used in the error message.
 * @throws {Error} If the value is not a non-empty string.
 */
function validateEmailString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid ${fieldName}. Must be a non-empty string.`);
  }
}

// Destructure email-related config
const {
  auth,
  host,
  port,
  senderName = "No Reply",
  newsletterSubject = "Translated Articles",
  newsletterTitle = "Translated Articles",
} = config.email;

// Verify the required config fields
if (!host || !port || !auth?.user || !auth?.pass) {
  console.error("Email configuration is incomplete. Check config.json.");
  Deno.exit(1);
}

/**
 * Creates a Nodemailer transporter.
 *
 * @example
 * // This transporter is used internally by sendEmail.
 * console.log(transporter);
 */
const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // Typically true for port 465
  auth,
});

/**
 * Sends a single email to a specified recipient.
 *
 * @example
 * // Example usage:
 * await sendEmail("recipient@example.com", "Welcome!", "<p>Hello, welcome to our newsletter!</p>");
 *
 * @param recipientEmail - The recipient's email address.
 * @param subject - The email subject.
 * @param content - The HTML content of the email.
 * @returns A promise that resolves when the email is sent.
 */
export async function sendEmail(
  recipientEmail: string,
  subject: string,
  content: string
): Promise<void> {
  validateEmailString(recipientEmail, "recipientEmail");
  validateEmailString(subject, "subject");
  validateEmailString(content, "content");

  const mailOptions = {
    from: `"${senderName}" <${auth.user}>`,
    replyTo: auth.user,
    to: recipientEmail,
    subject,
    html: content,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Failed to send email to ${recipientEmail}:`, error);
  }
}

/**
 * Sends translated articles to a list of subscriber emails.
 *
 * @example
 * // Example usage:
 * const subscribers = ["user1@example.com", "user2@example.com"];
 * const articles = [
 *   { title: "News Update", content: "<p>Breaking news content...</p>" }
 * ];
 * await sendEmails(subscribers, articles);
 *
 * @param subscribers - An array of valid email addresses.
 * @param articles - An array of articles, each containing a title and content.
 * @returns A promise that resolves when all emails have been sent.
 */
export async function sendEmails(
  subscribers: string[],
  articles: Array<{ title: string; content: string }>
): Promise<void> {
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

  const subject = newsletterSubject;
  const content = generateEmailContent(articles);

  const emailPromises = subscribers.map(async (subscriber) => {
    try {
      await sendEmail(subscriber, subject, content);
    } catch (error) {
      console.error(`Error sending email to ${subscriber}:`, error);
    }
  });

  await Promise.all(emailPromises);
  console.log("Finished sending translated articles to subscribers.");
}
