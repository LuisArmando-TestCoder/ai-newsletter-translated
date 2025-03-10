import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import { updateNewsletterUser } from "../../databaseSetup.ts";

export default (app: Express) => {
  app.put(
    "/users/:email",
    asyncHandler(async (req, res) => {
      const { email } = req.params;
      await updateNewsletterUser(email, req.body);
      res.json({ message: "User updated successfully." });
    })
  );
};
