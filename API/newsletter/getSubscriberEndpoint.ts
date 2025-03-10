import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import getNewsletterUser from "../../db/newsletter/getNewsletterUser.ts";

export default (app: Express) => {
  app.get(
    "/users/:email",
    asyncHandler(async (req, res) => {
      const { email } = req.params;
      const newsletterUser = await getNewsletterUser(email);
      res.json(newsletterUser);
    })
  );
};
