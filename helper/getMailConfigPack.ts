import errorLog from "./errorLog.ts";
import nodemailer from "npm:nodemailer";

// Helper: Validate and create a mail configuration pack.
export default (emailConfig: any) => {
  const {
    auth,
    host,
    port,
    senderName = "No Reply",
    newsletterSubject = "Translated Articles",
  } = emailConfig;
  if (!host || !port || !auth?.user || !auth?.pass) {
    errorLog("Email configuration is incomplete. Check config.json.");
    Deno.exit(1);
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465.
    auth,
  });
  return { host, auth, port, senderName, newsletterSubject, transporter };
};
