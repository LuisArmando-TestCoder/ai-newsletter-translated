import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import deleteNewsletterUser from "../../db/newsletter/deleteNewsletterUser.ts";
import evalDenoFile from "../../helper/evalDenoFile.ts";

export default (app: Express) => {
  // Endpoint: Unsubscribe User.
  app.get(
    "/unsubscribe/:email",
    asyncHandler(async (req, res) => {
      const { email } = req.params;
      await deleteNewsletterUser(email);

      const unsubscriptionTemplate = await evalDenoFile(
        "./templates/unsubscription.html",
        {
          email,
        }
      );

      res.send(unsubscriptionTemplate);
    })
  );
};
