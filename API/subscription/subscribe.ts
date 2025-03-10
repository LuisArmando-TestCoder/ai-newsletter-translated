import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import { addNewsletterUser } from "../../databaseSetup.ts";

export default (app: Express) => {
  app.post(
    "/users",
    asyncHandler(async (req, res) => {
      await addNewsletterUser(req.body);
      res.status(201).json({ message: "User added successfully." });
    })
  );
};
