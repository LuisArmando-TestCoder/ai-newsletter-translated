import express from "npm:express";
import { scheduleTasks } from "./helper/cronScheduler.ts";
import subscriptionRouter from "./API/newsletter/subscriptionRouter.ts";
import log from "./helper/log.ts";
import processNewsletter from "./engine/processNewsletter.ts";
import configurationRouter from "./API/configuration/configurationRouter.ts";
import getConfigDocument from "./db/configuration/getConfigDocument.ts";

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
