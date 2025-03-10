import type { Express } from "npm:express";
import uploadConfiguration from "./uploadConfiguration.ts";

export default (app: Express) => {
    uploadConfiguration(app);
};
