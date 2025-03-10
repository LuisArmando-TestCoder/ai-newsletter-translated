import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import updateConfigDocument from "../../db/configuration/updateConfigDocument.ts";

export default (app: Express) => {
  app.put(
    "/config",
    asyncHandler(async (req, res) => {
      const configData = req.body;
      if (!configData || typeof configData !== "object") {
        return res.status(400).json({ error: "Invalid configuration data." });
      }
      const documentId = (req.query.documentId as string) || "defaultConfig";
      await updateConfigDocument(configData, documentId);
      res.status(200).json({
        message: `Configuration updated successfully with ID: ${documentId}`,
      });
    })
  );
};
