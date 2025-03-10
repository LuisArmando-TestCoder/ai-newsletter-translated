import type { Express } from "npm:express";
import uploadConfigurationEndpoint from "./uploadConfigurationEndpoint.ts";
import getConfigurationEndpoint from "./getConfigurationEndpoint.ts";
import updateConfigurationEndpoint from "./updateConfigurationEndpoint.ts";

export default (app: Express) => {
    uploadConfigurationEndpoint(app);
    getConfigurationEndpoint(app);
    updateConfigurationEndpoint(app);
};
