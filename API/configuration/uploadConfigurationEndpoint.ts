import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import postConfigDocument from "../../db/configuration/postConfigDocument.ts";

export default (app: Express) => {
  // Endpoint: Post Configuration Document.
  app.post(
    "/config",
    asyncHandler(async (req, res) => {
      const configData = req.body;
      if (!configData || typeof configData !== "object") {
        return res.status(400).json({ error: "Invalid configuration data." });
      }
      const documentId = (req.query.documentId as string) || "defaultConfig";
      await postConfigDocument(configData, documentId);
      res.status(201).json({
        message: `Configuration stored successfully with ID: ${documentId}`,
      });
    })
  );
};