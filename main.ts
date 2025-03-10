import express from "npm:express";
import { scheduleTasks } from "./helper/cronScheduler.ts";
import { getConfigDocument, postConfigDocument } from "./databaseSetup.ts";
import subscriptionRouter from "./API/subscription/subscriptionRouter.ts";
import log from "./helper/log.ts";
import asyncHandler from "./helper/asyncHandler.ts";
import processNewsletter from "./engine/processNewsletter.ts";
import configurationRouter from "./API/config/configurationRouter.ts";

// Create and configure the Express server.
async function createServer() {
  const config = await getConfigDocument();
  const app = express();
  app.use(express.json());
  subscriptionRouter(app);
  configurationRouter(app);
  scheduleTasks(processNewsletter(config), config.scheduleTime);

  // Start the server.
  const port = config.port || 3000;
  app.listen(port, () => log(`Server is running on port ${port}`));
}

if (import.meta.main) {
  createServer();
}
