import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import deleteNewsletterUser from "../../db/newsletter/deleteNewsletterUser.ts";

export default (app: Express) => {
  // Endpoint: Unsubscribe User.
  app.get(
    "/unsubscribe/:email",
    asyncHandler(async (req, res) => {
      const { email } = req.params;
      await deleteNewsletterUser(email);
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Unsubscribed Successfully</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #f0f2f5;
              font-family: Helvetica, Arial, sans-serif;
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .container {
              background: #ffffff;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              text-align: center;
              max-width: 500px;
              margin: 0 20px;
            }
            h1 {
              margin: 0 0 20px;
              font-size: 2em;
              color: #333;
            }
            p {
              font-size: 1em;
              color: #666;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Unsubscribed Successfully</h1>
            <p>The email <strong>${email}</strong> has been removed from our newsletter.</p>
          </div>
        </body>
        </html>
      `);
    })
  );
};
