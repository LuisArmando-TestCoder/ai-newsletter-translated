import nodemailer from "npm:nodemailer";
import config from "./config.ts";

/**
 * Validate that a given value is a non-empty string.
 * Throws an error if invalid.
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
 * Create Nodemailer transporter
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
 * @param recipientEmail - The recipient's email address
 * @param subject - The email subject
 * @param content - The HTML content of the email
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
 * Builds an HTML-formatted string containing the newsletter articles.
 *
 * @param articles - An array of article objects (must contain title & content)
 */
export function generateEmailContent(
  articles: Array<{ title: string; content: string }>
): string {
  // You may customize fonts, colors, spacing, etc.
  return `
    <div style="margin:0;padding:0;background-color:#f4f4f4;">
      <table 
        border="0" 
        cellpadding="0" 
        cellspacing="0" 
        width="100%" 
        style="margin:0;padding:0;"
      >
        <tr>
          <td align="center" style="padding: 20px 0;">
            <!-- Main container table -->
            <table 
              border="0" 
              cellpadding="0" 
              cellspacing="0" 
              width="600" 
              style="background-color:#ffffff; border-radius:8px; overflow:hidden;"
            >
              <!-- Header Section -->
              <tr>
                <td align="center" style="background-color:#022b3a; padding: 20px;">
                  <h1 style="
                    margin:0;
                    color:#ffffff;
                    font-family:Arial, Helvetica, sans-serif;
                    font-size:28px;
                    "
                  >
                    Latest News
                  </h1>
                </td>
              </tr>

              <!-- Greeting Section -->
              <tr>
                <td style="padding: 20px; font-family:Arial, Helvetica, sans-serif;">
                  <p style="
                    margin:0;
                    font-size:16px;
                    color:#333333;
                    line-height:1.5;
                  ">
                    Hi Mudanzas Internacionales community,
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
                    console.error(`Invalid article content at index ${index}`);
                    return "";
                  }

                  return `
                      <tr>
                        <td style="padding: 20px; font-family:Arial, Helvetica, sans-serif; border-top:1px solid #eaeaea;">
                          <div style="
                            font-size:14px;
                            color:#333333;
                            line-height:1.6;
                          ">
                            ${article.content}
                          </div>
                          <p style="
                            font-size:12px;
                            color:#555555;
                            margin-top:10px;
                          ">
                            <em>I translated this news for you, with care. – Pablo Arias</em>
                          </p>
                        </td>
                      </tr>
                    `;
                })
                .join("")}

              <!-- Footer Section -->
              <tr>
                <td 
                  align="center" 
                  style="
                    background-color:#022b3a;
                    padding: 20px;
                    color:#ffffff;
                    font-family:Arial, Helvetica, sans-serif;
                  "
                >
                  <p style="margin:0; font-size:14px;">
                    &copy; ${new Date().getFullYear()} Mudanzas Internacionales<br/>
                    1234 Moving Street, Worldwide
                  </p>
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

/**
 * Sends translated articles to a list of subscriber emails.
 *
 * @param subscribers - An array of valid email addresses
 * @param articles - An array of articles with { title, content }
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
