import type { Express } from "npm:express";
import asyncHandler from "../../helper/asyncHandler.ts";
import getConfigDocument from "../../db/configuration/getConfigDocument.ts";

export default (app: Express) => {
  // Endpoint: Get Configuration Document.
  app.get(
    "/config",
    asyncHandler(async (req, res) => {
      const documentId = (req.query.documentId as string) || "defaultConfig";
      const configDoc = await getConfigDocument(documentId);
      res.status(200).json(configDoc);
    })
  );
};
