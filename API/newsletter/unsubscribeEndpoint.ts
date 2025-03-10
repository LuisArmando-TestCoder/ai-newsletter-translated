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
        <h1>Unsubscribed Successfully</h1>
        <p>The email <strong>${email}</strong> has been removed from our newsletter.</p>
      `);
    })
  );
};
